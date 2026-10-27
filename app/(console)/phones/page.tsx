import { Banner, Chips, Empty, PageHeader, Pager, Pill, SearchBox } from "@/components/ui";
import { first, hrefWith, labelize, pageNumber, searchTerm } from "@/lib/format";
import type { MobileDevice } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Page } from "@/lib/types";
import { oneOf } from "@/lib/validate";

export const metadata = { title: "Phones" };

const PLATFORMS = ["", "iOS", "android", "macOS", "windows", "chrome"] as const;
const HEALTH = ["", "green", "amber", "red"] as const;

export default async function PhonesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const platform = oneOf(first(params.platform), PLATFORMS.filter(Boolean));
  const healthState = oneOf(first(params.health), HEALTH.filter(Boolean));
  const search = searchTerm(first(params.q));
  const pageNumberValue = pageNumber(first(params.page));
  const session = await requireSession();

  let page: Page<MobileDevice> | null = null;
  let error: string | null = null;
  try {
    page = await sophos<Page<MobileDevice>>(session, "/mobile/v1/devices", {
      query: { page: pageNumberValue, pageSize: 25, pageTotal: true, view: "summary", platform, healthState, search },
    });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "Phones could not be loaded.";
  }

  const items = page?.items ?? [];
  const keep = { platform, health: healthState, q: search };
  const hasNext = typeof page?.pages?.total === "number" ? pageNumberValue < page.pages.total : items.length === 25;

  return (
    <div>
      <PageHeader title="Phones" lede="Sophos Mobile devices. Lock, scan, locate, or wipe from the device itself." />
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <SearchBox action="/phones" placeholder="Search phones" defaultValue={search} hidden={{ platform, health: healthState }} />
      <Chips
        path="/phones"
        param="platform"
        value={platform}
        keep={{ health: healthState, q: search }}
        options={PLATFORMS.map((item) => [item, item || "Any platform"])}
      />
      <Chips
        path="/phones"
        param="health"
        value={healthState}
        keep={{ platform, q: search }}
        options={[
          ["", "Any health"],
          ["green", "Green"],
          ["amber", "Amber"],
          ["red", "Red"],
        ]}
      />
      <div className="list">
        {items.length === 0 && !error ? (
          <Empty title="No phones match">Mobile is available in some Sophos regions. If this tenant has no Mobile product, the list stays empty.</Empty>
        ) : null}
        {items.map((device) => (
          <a className="item" key={device.id} href={`/phones/${device.id}`}>
            <span className="item-main">
              <span className="item-title">{device.name || "Unnamed phone"}</span>
              <span className="item-sub">
                {labelize(device.platform || device.osName)} · {labelize(device.managedState, "Unknown state")}
              </span>
            </span>
            <Pill tone={device.healthState === "red" ? "bad" : device.healthState === "amber" ? "suspicious" : "good"}>
              {labelize(device.healthState, "Unknown")}
            </Pill>
          </a>
        ))}
      </div>
      <Pager
        prevHref={pageNumberValue > 1 ? hrefWith("/phones", { ...keep, page: String(pageNumberValue - 1) }) : undefined}
        nextHref={hasNext ? hrefWith("/phones", { ...keep, page: String(pageNumberValue + 1) }) : undefined}
      />
    </div>
  );
}
