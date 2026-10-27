import { Banner, Chips, Empty, PageHeader, Pager, Pill, SearchBox } from "@/components/ui";
import { first, hrefWith, labelize, pageKey, searchTerm, timeAgo } from "@/lib/format";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Endpoint, Page } from "@/lib/types";

export const metadata = { title: "Devices" };

const FILTERS: [string, string][] = [
  ["", "All"],
  ["bad", "Bad health"],
  ["suspicious", "Suspicious"],
  ["isolated", "Isolated"],
  ["offline", "Offline"],
  ["computer", "Computers"],
  ["server", "Servers"],
];

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filter = FILTERS.some(([value]) => value === (first(params.filter) ?? "")) ? first(params.filter) || "" : "";
  const q = searchTerm(first(params.q));
  const cursor = pageKey(first(params.pageFromKey));
  const removed = first(params.removed) === "1";
  const session = await requireSession();

  const query: Record<string, string | boolean | undefined> = {
    pageSize: "20",
    view: "summary",
    search: q,
    pageFromKey: cursor,
    pageTotal: "true",
  };
  if (filter === "bad" || filter === "suspicious") query.healthStatus = filter;
  if (filter === "isolated") query.isolationStatus = "isolated";
  if (filter === "offline") query.online = false;
  if (filter === "computer" || filter === "server") query.type = filter;

  let page: Page<Endpoint> | null = null;
  let error: string | null = null;
  try {
    page = await sophos<Page<Endpoint>>(session, "/endpoint/v1/endpoints", { query });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "Devices could not be loaded.";
  }

  const keep = { filter: filter || undefined, q };
  const items = page?.items ?? [];

  return (
    <div>
      <PageHeader title="Devices" lede="Computers and servers protected by this tenant." />
      {removed ? <Banner tone="good">The device was deleted in Sophos.</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <SearchBox action="/devices" placeholder="Search hostname, person, or IP" defaultValue={q} hidden={{ filter }} />
      <Chips path="/devices" param="filter" value={filter} keep={{ q }} options={FILTERS} />
      <div className="list">
        {items.length === 0 && !error ? <Empty title="No devices match">Try a different search or filter.</Empty> : null}
        {items.map((device) => (
          <a className="item" key={device.id} href={`/devices/${device.id}`}>
            <span className="item-main">
              <span className="item-title">{device.hostname || "Unnamed device"}</span>
              <span className="item-sub">
                {labelize(device.os?.platform)} · {device.online === false ? "Offline" : device.online ? "Online" : "Presence unknown"} ·{" "}
                {timeAgo(device.lastSeenAt)}
              </span>
            </span>
            <Pill tone={device.isolation?.status === "isolated" ? "bad" : device.health?.overall}>
              {device.isolation?.status === "isolated" ? "Isolated" : labelize(device.health?.overall, "Unknown")}
            </Pill>
          </a>
        ))}
      </div>
      <Pager
        prevHref={cursor ? hrefWith("/devices", keep) : undefined}
        nextHref={page?.pages?.nextKey ? hrefWith("/devices", { ...keep, pageFromKey: page.pages.nextKey }) : undefined}
      />
    </div>
  );
}
