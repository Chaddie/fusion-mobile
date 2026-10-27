import { Banner, Chips, Empty, PageHeader, Pager, Pill } from "@/components/ui";
import { first, hrefWith, labelize, pageNumber } from "@/lib/format";
import { assigneeLabel, CASE_STATUSES, type CaseRecord } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Page } from "@/lib/types";
import { oneOf } from "@/lib/validate";

export const metadata = { title: "Cases" };

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const status = oneOf(first(params.status), CASE_STATUSES);
  const pageNumberValue = pageNumber(first(params.page));
  const session = await requireSession();

  let page: Page<CaseRecord> | null = null;
  let error: string | null = null;
  try {
    page = await sophos<Page<CaseRecord>>(session, "/cases/v1/cases", {
      query: { page: pageNumberValue, pageSize: 20, pageTotal: true, status, sort: "createdAt:desc" },
    });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "Cases could not be loaded.";
  }

  const items = page?.items ?? [];

  return (
    <div>
      <PageHeader
        title="Cases"
        lede="Investigations, incidents, and the detections attached to them."
        action={
          <a className="btn primary" href="/cases/new">
            New
          </a>
        }
      />
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <Chips
        path="/cases"
        param="status"
        value={status}
        options={[
          ["", "All"],
          ["new", "New"],
          ["investigating", "Investigating"],
          ["actionRequired", "Needs action"],
          ["onHold", "On hold"],
          ["resolved", "Resolved"],
        ]}
      />
      <div className="list">
        {items.length === 0 && !error ? <Empty title="No cases match">Create one, or try another status.</Empty> : null}
        {items.map((item) => (
          <a className="item" key={item.id} href={`/cases/${item.id}`}>
            <span className="item-main">
              <span className="item-title">{item.name || "Untitled case"}</span>
              <span className="item-sub">
                {labelize(item.type)} · {item.detectionCount ?? 0} detections · {assigneeLabel(item.assignee)}
              </span>
            </span>
            <Pill tone={item.severity === "critical" ? "high" : item.severity}>{labelize(item.status, "Open")}</Pill>
          </a>
        ))}
      </div>
      <Pager
        prevHref={pageNumberValue > 1 ? hrefWith("/cases", { status, page: String(pageNumberValue - 1) }) : undefined}
        nextHref={
          (typeof page?.pages?.total === "number" ? pageNumberValue < page.pages.total : items.length === 20)
            ? hrefWith("/cases", { status, page: String(pageNumberValue + 1) })
            : undefined
        }
      />
    </div>
  );
}
