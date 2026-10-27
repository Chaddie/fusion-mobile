import { ALERT_ACTIONS, ENDPOINT_TYPES, HEALTH, SEVERITIES, SOURCE_TYPES, type AlertAction } from "@/lib/constants";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PAGE_KEY_RE = /^[A-Za-z0-9+/=_-]{1,2048}$/;
const CASE_ID_RE = /^[A-Za-z0-9]+-[A-Za-z0-9]+$/;
const ENDPOINT_GROUP_TEXT_RE = /^[^#,+"\\<>;]+$/;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function isCaseId(value: string): boolean {
  return value.length <= 80 && CASE_ID_RE.test(value);
}

export function isDetectionId(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,150}$/.test(value);
}

export function cursorOf(value: string | undefined): string | undefined {
  if (!value || value.length > 8000 || /[\u0000-\u001f\s]/.test(value)) return undefined;
  return value;
}

export function policyNameOf(value: string): string | null {
  const name = value.replace(/[\u0000-\u001f]/g, "").trim();
  if (name.length < 1 || name.length > 100 || !/^\S(?:.*\S)?$/.test(name)) return null;
  return name;
}

export function settingKeyOf(value: string): string | null {
  if (!/^[A-Za-z0-9._/-]{1,160}$/.test(value)) return null;
  return value;
}

export function shortName(value: string, min: number, max: number): string | null {
  const name = value.replace(/[\u0000-\u001f]/g, "").trim();
  if (name.length < min || name.length > max) return null;
  return name;
}

export function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function unquote(value: string): string {
  return value.trim().replace(/^['"]|['"]$/g, "").trim();
}

export function searchTerm(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const cleaned = value.replace(/[\u0000-\u001f]/g, "").trim().slice(0, 80);
  return cleaned || undefined;
}

export function pageKey(value: string | undefined): string | undefined {
  if (!value || !PAGE_KEY_RE.test(value)) return undefined;
  return value;
}

export function pageNumber(value: string | undefined): number {
  const page = Number(value || "1");
  if (!Number.isInteger(page) || page < 1 || page > 500) return 1;
  return page;
}

export function oneOf<T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined {
  if (!value) return undefined;
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export function severityOf(value: string | undefined) {
  return oneOf(value, SEVERITIES);
}

export function healthOf(value: string | undefined) {
  return oneOf(value, HEALTH);
}

export function endpointTypeOf(value: string | undefined) {
  return oneOf(value, ENDPOINT_TYPES);
}

export function sourceOf(value: string | undefined) {
  return oneOf(value, SOURCE_TYPES);
}

export function alertActionOf(value: string | undefined): AlertAction | undefined {
  return oneOf(value, ALERT_ACTIONS);
}

export function personName(value: string): string | null {
  const name = value.replace(/[\u0000-\u001f]/g, "").trim();
  if (name.length < 1 || name.length > 250) return null;
  return name;
}

export function givenName(value: string): string | null {
  const name = value.replace(/[\u0000-\u001f]/g, "").trim();
  if (!name) return null;
  if (name.length > 250 || /\s/.test(name)) return null;
  return name;
}

export function optionalText(value: string, max: number): string | null {
  const cleaned = value.replace(/[\u0000-\u001f]/g, "").trim();
  if (!cleaned) return null;
  if (cleaned.length > max) return null;
  return cleaned;
}

export function endpointGroupText(value: string, max: number): string | null {
  const cleaned = value.replace(/[\u0000-\u001f]/g, "").trim();
  if (!cleaned || cleaned.length > max || !ENDPOINT_GROUP_TEXT_RE.test(cleaned)) return null;
  return cleaned;
}

export function emailOf(value: string): string | null {
  const email = value.trim();
  if (!email) return null;
  if (email.length > 250 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export function isAllowedRegion(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      /^api-[a-z0-9]+\.central\.sophos\.com$/i.test(url.hostname) &&
      url.pathname.replace(/\/$/, "") === "" &&
      url.username === "" &&
      url.search === "" &&
      url.hash === ""
    );
  } catch {
    return false;
  }
}
