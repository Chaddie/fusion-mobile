import { notFound } from "next/navigation";
import { AlertActions } from "@/components/alert-actions";
import { BackLink, Fact, PageHeader, Pill } from "@/components/ui";
import { formatWhen, labelize } from "@/lib/format";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Alert } from "@/lib/types";
import { isUuid } from "@/lib/validate";

export const metadata = { title: "Alert" };

export default async function AlertPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await requireSession();
  let alert: Alert;
  try {
    alert = await sophos<Alert>(session, `/common/v1/alerts/${id}`);
  } catch (error) {
    if (error instanceof SophosError && error.status === 404) notFound();
    throw error;
  }

  const deviceId = alert.managedAgent?.id;
  const personId = alert.person?.id;

  return (
    <div className="stack">
      <BackLink href="/alerts">Alerts</BackLink>
      <PageHeader title={alert.description || "Alert"} lede={labelize(alert.type, "")} />
      <div className="row">
        <Pill tone={alert.severity}>{labelize(alert.severity, "Alert")}</Pill>
        <Pill tone="info">{labelize(alert.product)}</Pill>
        {alert.status ? <Pill>{labelize(alert.status)}</Pill> : null}
      </div>
      <section className="card">
        <dl className="facts">
          <Fact label="Raised">{formatWhen(alert.raisedAt)}</Fact>
          <Fact label="Category">{labelize(alert.category)}</Fact>
          {typeof alert.eventCount === "number" ? <Fact label="Related events">{alert.eventCount}</Fact> : null}
          {alert.tenant?.name ? <Fact label="Tenant">{alert.tenant.name}</Fact> : null}
        </dl>
      </section>
      <div className="row">
        {deviceId && isUuid(deviceId) ? (
          <a className="btn ghost" href={`/devices/${deviceId}`}>
            Open device
          </a>
        ) : null}
        {personId && isUuid(personId) ? (
          <a className="btn ghost" href={`/people/${personId}`}>
            Open person
          </a>
        ) : null}
      </div>
      <section className="card stack">
        <h2>Action</h2>
        <AlertActions alertId={alert.id} actions={(alert.allowedActions ?? []).filter((item) => typeof item === "string")} />
      </section>
    </div>
  );
}
