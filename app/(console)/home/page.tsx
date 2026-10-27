import { Banner, Empty, PageHeader, Pill } from "@/components/ui";
import { countLabel, formatWhen, labelize, timeAgo } from "@/lib/format";
import type { CaseRecord } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Alert, Endpoint, Page } from "@/lib/types";

export const metadata = { title: "Home" };

function problem(error: unknown): string {
  if (error instanceof SophosError) return error.message;
  return "Some Sophos data could not be loaded.";
}

export default async function HomePage() {
  const session = await requireSession();
  const [alertsResult, highResult, badResult, devicesResult, casesResult] = await Promise.allSettled([
    sophos<Page<Alert>>(session, "/common/v1/alerts", { query: { pageSize: 5 } }),
    sophos<Page<Alert>>(session, "/common/v1/alerts", { query: { pageSize: 20, severity: "high", pageTotal: true } }),
    sophos<Page<Endpoint>>(session, "/endpoint/v1/endpoints", {
      query: { pageSize: 5, healthStatus: "bad", view: "summary", pageTotal: true },
    }),
    sophos<Page<Endpoint>>(session, "/endpoint/v1/endpoints", { query: { pageSize: 50, view: "basic", pageTotal: true } }),
    sophos<Page<CaseRecord>>(session, "/cases/v1/cases", {
      query: { pageSize: 5, status: "actionRequired", pageTotal: true },
    }),
  ]);

  const alerts = alertsResult.status === "fulfilled" ? alertsResult.value : null;
  const high = highResult.status === "fulfilled" ? highResult.value : null;
  const bad = badResult.status === "fulfilled" ? badResult.value : null;
  const devices = devicesResult.status === "fulfilled" ? devicesResult.value : null;
  const cases = casesResult.status === "fulfilled" ? casesResult.value : null;
  const failure = [alertsResult, highResult, badResult, devicesResult].find((result) => result.status === "rejected");
  const tenantName = alerts?.items?.find((item) => item.tenant?.name)?.tenant?.name;

  return (
    <div>
      <PageHeader title={tenantName || "Your tenant"} lede="What needs attention right now." />
      {failure && failure.status === "rejected" ? <Banner tone="bad">{problem(failure.reason)}</Banner> : null}
      <section className="stats">
        <a className="stat" href="/alerts?severity=high">
          <span className="stat-value">{high ? countLabel(high.items, high.pages) : "—"}</span>
          <span className="stat-label">High alerts</span>
        </a>
        <a className="stat" href="/devices?filter=bad">
          <span className="stat-value">{bad ? countLabel(bad.items, bad.pages) : "—"}</span>
          <span className="stat-label">Devices in bad health</span>
        </a>
        <a className="stat" href="/alerts">
          <span className="stat-value">{alerts ? countLabel(alerts.items, alerts.pages) : "—"}</span>
          <span className="stat-label">Latest alerts</span>
        </a>
        <a className="stat" href="/cases?status=actionRequired">
          <span className="stat-value">{cases ? countLabel(cases.items, cases.pages) : "—"}</span>
          <span className="stat-label">Cases needing action</span>
        </a>
        <a className="stat" href="/devices">
          <span className="stat-value">{devices ? countLabel(devices.items, devices.pages) : "—"}</span>
          <span className="stat-label">Devices</span>
        </a>
      </section>

      <div className="section-title">
        <h2>Recent alerts</h2>
        <a href="/alerts">See all</a>
      </div>
      <div className="list">
        {(alerts?.items ?? []).length === 0 ? (
          <Empty title="No alerts in this sample">Open alerts will show here when Sophos raises them.</Empty>
        ) : (
          alerts?.items?.map((alert) => (
            <a className="item" key={alert.id} href={`/alerts/${alert.id}`}>
              <span className="item-main">
                <span className="item-title">{alert.description || "Alert"}</span>
                <span className="item-sub">
                  {labelize(alert.product)} · {timeAgo(alert.raisedAt)}
                </span>
              </span>
              <Pill tone={alert.severity}>{labelize(alert.severity, "Alert")}</Pill>
            </a>
          ))
        )}
      </div>

      <div className="section-title">
        <h2>Devices that need a look</h2>
        <a href="/devices?filter=bad">See all</a>
      </div>
      <div className="list">
        {(bad?.items ?? []).length === 0 ? (
          <Empty title="No devices reported as bad">Health issues will show here.</Empty>
        ) : (
          bad?.items?.map((device) => (
            <a className="item" key={device.id} href={`/devices/${device.id}`}>
              <span className="item-main">
                <span className="item-title">{device.hostname || "Unnamed device"}</span>
                <span className="item-sub">Last seen {formatWhen(device.lastSeenAt)}</span>
              </span>
              <Pill tone={device.health?.overall}>{labelize(device.health?.overall, "Unknown")}</Pill>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
