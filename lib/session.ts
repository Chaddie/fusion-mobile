import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/constants";
import type { Session } from "@/lib/types";
import { isAllowedRegion, isUuid } from "@/lib/validate";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let cachedSecret: string | null = null;
let cachedKey: Promise<CryptoKey> | null = null;

export function secretConfigured(): boolean {
  return (process.env.SESSION_SECRET?.length ?? 0) >= 32;
}

function requireSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Set SESSION_SECRET to a random string of at least 32 characters.");
  }
  return secret;
}

async function aesKey(): Promise<CryptoKey> {
  const secret = requireSecret();
  if (cachedKey && cachedSecret === secret) return cachedKey;
  cachedSecret = secret;
  cachedKey = crypto.subtle
    .digest("SHA-256", encoder.encode(secret))
    .then((digest) => crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]));
  return cachedKey;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export async function sealSession(session: Session): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await aesKey(), encoder.encode(JSON.stringify(session))),
  );
  const packed = new Uint8Array(iv.length + encrypted.length);
  packed.set(iv, 0);
  packed.set(encrypted, iv.length);
  return bytesToBase64Url(packed);
}

export async function openSession(token: string): Promise<Session | null> {
  try {
    const packed = base64UrlToBytes(token);
    if (packed.length < 13) return null;
    const iv = packed.slice(0, 12);
    const encrypted = packed.slice(12);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, await aesKey(), encrypted);
    const parsed = JSON.parse(decoder.decode(plain)) as Partial<Session>;
    if (parsed.v !== 1 || parsed.idType !== "tenant") return null;
    if (!parsed.clientId || !parsed.clientSecret || !parsed.tenantId || !parsed.dataRegion) return null;
    if (!isUuid(parsed.clientId) || !isUuid(parsed.tenantId)) return null;
    if (!isAllowedRegion(parsed.dataRegion)) return null;
    if (parsed.clientSecret.length < 8 || parsed.clientSecret.length > 300) return null;
    return {
      v: 1,
      clientId: parsed.clientId,
      clientSecret: parsed.clientSecret,
      tenantId: parsed.tenantId,
      idType: "tenant",
      dataRegion: parsed.dataRegion.replace(/\/$/, ""),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  if (!secretConfigured()) return null;
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return openSession(token);
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/");
  return session;
}

export async function writeSession(session: Session): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sealSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export function deploymentCredentials(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.SOPHOS_CLIENT_ID?.trim();
  const clientSecret = process.env.SOPHOS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}
