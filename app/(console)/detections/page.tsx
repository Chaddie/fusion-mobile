import { Banner, Empty, PageHeader, Pager, Pill } from "@/components/ui";
import { first, formatWhen, hrefWith, labelize } from "@/lib/format";
import type { SiemEvent, SiemPage } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import { cursorOf, isUuid } from "@/lib/validate";

export const metadata = { title: "Detections" };

function tone(severity?: string): string {
  const value = (severity || "").toLowerCase();
  if (value === "critical" || value === "high") return "high";
  if (value === "medium") return "medium";
  return "low";
}

export default async function DetectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const cursor = cursorOf(first(params.cursor));
  const session = await requireSession();

  let page: SiemPage | null = null;
  let error: string | null = null;
  try {
    page = await sophos<SiemPage>(session, "/siem/v1/events", {
      query: { limit: 200, cursor },
    });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "Detections could not be loaded.";
  }

  const items = page?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Detections"
        lede="Events from the last 24 hours. Detections that belong to an investigation are listed on that case."
      />
      <p className="fine-print">
        <a href="/cases">Open cases</a>
      </p>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <div className="list">
        {items.length === 0 && !error ? <Empty title="No events in this window">Sophos keeps this feed to the last day.</Empty> : null}
        {items.map((event, index) => (
          <EventRow key={event.id || `${event.created_at}-${index}`} event={event} />
        ))}
      </div>
      <Pager
        prevHref={cursor ? hrefWith("/detections", {}) : undefined}
        nextHref={page?.has_more && page.next_cursor ? hrefWith("/detections", { cursor: page.next_cursor }) : undefined}
      />
    </div>
  );
}

function EventRow({ event }: { event: SiemEvent }) {
  const title = event.name || event.threat || event.type || "Event";
  const when = event.when || event.created_at;
  const device =
    event.endpoint_id && isUuid(event.endpoint_id) ? (
      <a href={`/devices/${event.endpoint_id}`}>{event.location || "Device"}</a>
    ) : (
      event.location || labelize(event.source, "Sophos")
    );
  return (
    <article className="item">
      <span className="item-main">
        <span className="item-title">{title}</span>
        <span className="item-sub">
          {labelize(event.type)} · {device} · {formatWhen(when)}
        </span>
      </span>
      <Pill tone={tone(event.severity)}>{labelize(event.severity, "Info")}</Pill>
    </article>
  );
}
