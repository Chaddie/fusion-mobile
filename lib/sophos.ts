import "server-only";

import type { Session } from "@/lib/types";
import { isAllowedRegion, isUuid } from "@/lib/validate";

const TOKEN_URL = "https://id.sophos.com/api/v2/oauth2/token";
const WHOAMI_URL = "https://api.central.sophos.com/whoami/v1";

type TokenCache = { token: string; expiresAt: number };
const tokens = new Map<string, TokenCache>();

export class SophosError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "SophosError";
    this.status = status;
  }
}

type Query = Record<string, string | number | boolean | string[] | undefined>;

type Whoami = {
  id?: string;
  idType?: string;
  apiHosts?: { dataRegion?: string };
};

function messageFrom(status: number, body: unknown): string {
  if (status === 401) return "Sophos did not accept these credentials.";
  if (status === 429) return "Sophos is rate limiting requests. Wait a moment and try again.";
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    if (typeof record.message === "string" && record.message.trim()) return record.message.trim();
    if (typeof record.error === "string" && record.error.trim()) return record.error.trim();
    const nested = record.error;
    if (nested && typeof nested === "object" && typeof (nested as { message?: unknown }).message === "string") {
      return (nested as { message: string }).message;
    }
  }
  if (status === 403) return "This API credential is not allowed to do that.";
  if (status === 404) return "Sophos could not find that record.";
  if (status === 409) return "Sophos refused the change. Synced directory records have to be edited at their source, and groups must be empty before they can be deleted.";
  return `Sophos returned status ${status}.`;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text.slice(0, 240) };
  }
}

function assertSophosUrl(url: URL): void {
  const allowed =
    url.protocol === "https:" &&
    (url.hostname === "id.sophos.com" || /^api(-[a-z0-9]+)?\.central\.sophos\.com$/i.test(url.hostname));
  if (!allowed || url.username || url.password) {
    throw new SophosError(400, "Refused a request to an unexpected Sophos host.");
  }
}

async function sophosFetch(url: string, init: RequestInit): Promise<Response> {
  const parsed = new URL(url);
  assertSophosUrl(parsed);
  return fetch(parsed, {
    ...init,
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
}

export function invalidateToken(clientId: string): void {
  tokens.delete(clientId);
}

async function fetchToken(clientId: string, clientSecret: string): Promise<string> {
  const cached = tokens.get(clientId);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: "token",
  });
  let response: Response;
  try {
    response = await sophosFetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body,
    });
  } catch {
    throw new SophosError(503, "Could not reach Sophos. Check your connection and try again.");
  }
  if (response.status === 0 || (response.status >= 300 && response.status < 400)) {
    throw new SophosError(502, "Sophos redirected the sign-in request. Nothing was connected.");
  }
  const payload = (await readBody(response)) as { access_token?: string; expires_in?: number; message?: string };
  if (!response.ok || !payload?.access_token) {
    throw new SophosError(response.status || 401, messageFrom(response.status || 401, payload));
  }
  const expiresIn = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  tokens.set(clientId, { token: payload.access_token, expiresAt: Date.now() + expiresIn * 1000 });
  return payload.access_token;
}

export async function connectTenant(clientId: string, clientSecret: string): Promise<Session> {
  const token = await fetchToken(clientId, clientSecret);
  let response: Response;
  try {
    response = await sophosFetch(WHOAMI_URL, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });
  } catch {
    throw new SophosError(503, "Could not reach Sophos to look up this tenant.");
  }
  const who = (await readBody(response)) as Whoami;
  if (!response.ok) throw new SophosError(response.status, messageFrom(response.status, who));
  if (who.idType !== "tenant" || !who.id || !isUuid(who.id)) {
    const kind = who.idType || "unknown";
    throw new SophosError(
      400,
      `These credentials belong to a ${kind} account. Create them inside the tenant at Global Settings → API Credentials.`,
    );
  }
  const dataRegion = who.apiHosts?.dataRegion?.replace(/\/$/, "");
  if (!dataRegion || !isAllowedRegion(dataRegion)) {
    throw new SophosError(400, "Sophos did not return a data region for this tenant.");
  }
  return { v: 1, clientId, clientSecret, tenantId: who.id, idType: "tenant", dataRegion };
}

function appendQuery(url: URL, query?: Query): void {
  if (!query) return;
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      for (const item of value) url.searchParams.append(key, item);
    } else {
      url.searchParams.set(key, String(value));
    }
  }
}

export async function sophos<T>(
  session: Session,
  path: string,
  init?: { method?: string; query?: Query; body?: unknown },
): Promise<T> {
  if (!path.startsWith("/common/v1/") && !path.startsWith("/endpoint/v1/")) {
    throw new SophosError(400, "That Sophos API path is not available in this app.");
  }
  if (path.includes("..") || path.includes("://") || path.includes("\\")) {
    throw new SophosError(400, "That Sophos API path is not available in this app.");
  }

  const send = async (token: string) => {
    const url = new URL(path, `${session.dataRegion}/`);
    appendQuery(url, init?.query);
    assertSophosUrl(url);
    const headers = new Headers({
      Authorization: `Bearer ${token}`,
      "X-Tenant-ID": session.tenantId,
      Accept: "application/json",
      "User-Agent": "Fusion-Mobile/1.0",
    });
    let body: string | undefined;
    if (init?.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(init.body);
    }
    try {
      return await sophosFetch(url.toString(), { method: init?.method ?? "GET", headers, body });
    } catch {
      throw new SophosError(503, "Could not reach Sophos. Check your connection and try again.");
    }
  };

  let token = await fetchToken(session.clientId, session.clientSecret);
  let response = await send(token);
  if (response.status === 401) {
    invalidateToken(session.clientId);
    token = await fetchToken(session.clientId, session.clientSecret);
    response = await send(token);
  }
  if (response.status === 0 || (response.status >= 300 && response.status < 400)) {
    throw new SophosError(502, "Sophos redirected the request. Nothing was changed.");
  }
  const payload = await readBody(response);
  if (!response.ok) {
    throw new SophosError(response.status, messageFrom(response.status, payload));
  }
  return payload as T;
}
