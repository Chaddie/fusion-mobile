import { Banner, Chips, Empty, PageHeader, Pager, Pill } from "@/components/ui";
import { first, hrefWith, labelize, pageKey, timeAgo } from "@/lib/format";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Alert, Page } from "@/lib/types";
import { oneOf, severityOf } from "@/lib/validate";

export const metadata = { title: "Alerts" };

const PRODUCTS = ["", "endpoint", "server", "firewall", "emailGateway", "mobile"] as const;

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const severity = severityOf(first(params.severity));
  const product = oneOf(first(params.product), PRODUCTS.filter(Boolean));
  const cursor = pageKey(first(params.pageFromKey));
  const session = await requireSession();

  let page: Page<Alert> | null = null;
  let error: string | null = null;
  try {
    page = await sophos<Page<Alert>>(session, "/common/v1/alerts", {
      query: { pageSize: 20, pageFromKey: cursor, severity, product, pageTotal: true },
    });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "Alerts could not be loaded.";
  }

  const keep = { severity, product };
  const items = page?.items ?? [];

  return (
    <div>
      <PageHeader title="Alerts" lede="Open the ones that need a decision. Actions run through Sophos." />
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <Chips
        path="/alerts"
        param="severity"
        value={severity}
        keep={{ product }}
        options={[
          ["", "All"],
          ["high", "High"],
          ["medium", "Medium"],
          ["low", "Low"],
        ]}
      />
      <Chips
        path="/alerts"
        param="product"
        value={product}
        keep={{ severity }}
        options={PRODUCTS.map((item) => [item, item ? labelize(item) : "Any product"])}
      />
      <div className="list">
        {items.length === 0 && !error ? <Empty title="No alerts match">Try another severity or product.</Empty> : null}
        {items.map((alert) => (
          <a className="item" key={alert.id} href={`/alerts/${alert.id}`}>
            <span className="item-main">
              <span className="item-title">{alert.description || "Alert"}</span>
              <span className="item-sub">
                {labelize(alert.category)} · {labelize(alert.product)} · {timeAgo(alert.raisedAt)}
              </span>
            </span>
            <Pill tone={alert.severity}>{labelize(alert.severity, "Alert")}</Pill>
          </a>
        ))}
      </div>
      <Pager
        prevHref={cursor ? hrefWith("/alerts", keep) : undefined}
        nextHref={page?.pages?.nextKey ? hrefWith("/alerts", { ...keep, pageFromKey: page.pages.nextKey }) : undefined}
      />
    </div>
  );
}
