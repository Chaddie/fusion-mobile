import { PRODUCT_LABELS, SOURCE_LABELS } from "@/lib/constants";
import type { PageInfo } from "@/lib/types";

export { pageKey, pageNumber, searchTerm } from "@/lib/validate";

export function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function labelize(value: string | undefined, fallback = "Unknown"): string {
  if (!value) return fallback;
  if (PRODUCT_LABELS[value]) return PRODUCT_LABELS[value];
  if (value in SOURCE_LABELS) return SOURCE_LABELS[value as keyof typeof SOURCE_LABELS];
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function regionLabel(dataRegion: string): string {
  const match = dataRegion.match(/api-([a-z0-9]+)\.central\.sophos\.com/i);
  return match ? match[1].toUpperCase() : "REGION";
}

export function formatWhen(iso?: string): string {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function timeAgo(iso?: string): string {
  if (!iso) return "Unknown";
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  const seconds = Math.round((Date.now() - time) / 1000);
  const abs = Math.abs(seconds);
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];
  let value = abs;
  let unit = "second";
  for (const [step, name] of units) {
    if (value < step) {
      unit = name;
      break;
    }
    value = Math.round(value / step);
    unit = name;
  }
  const rounded = Math.max(1, value);
  const noun = rounded === 1 ? unit : `${unit}s`;
  return seconds >= 0 ? `${rounded} ${noun} ago` : `in ${rounded} ${noun}`;
}

export function countLabel(items: unknown[] | undefined, pages?: PageInfo): string {
  if (typeof pages?.items === "number") return String(pages.items);
  const shown = items?.length ?? 0;
  const moreByKey = Boolean(pages?.nextKey);
  const moreByPage = Boolean(pages?.current && pages?.total && pages.current < pages.total);
  if (moreByKey || moreByPage) return `${shown}+`;
  return String(shown);
}

export function hrefWith(path: string, query: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }
  const text = params.toString();
  return text ? `${path}?${text}` : path;
}

export function shortId(value: string): string {
  return value.slice(0, 8);
}
