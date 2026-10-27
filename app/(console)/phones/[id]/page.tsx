import { notFound } from "next/navigation";
import { BackLink, Banner, Empty, Fact, PageHeader, Pill } from "@/components/ui";
import { DangerZone, InlineForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { deletePhone, mobileAction } from "@/app/product-actions";
import { formatWhen, labelize } from "@/lib/format";
import { actionAvailable, type MobileDevice, type ScanResult } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Page } from "@/lib/types";
import { isUuid } from "@/lib/validate";

export const metadata = { title: "Phone" };

export default async function PhonePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await requireSession();

  let device: MobileDevice | null = null;
  let scans: ScanResult[] = [];
  let error: string | null = null;
  try {
    device = await sophos<MobileDevice>(session, `/mobile/v1/devices/${id}`, { query: { view: "full" } });
  } catch (caught) {
    if (caught instanceof SophosError && caught.status === 404) notFound();
    error = caught instanceof SophosError ? caught.message : "This phone could not be loaded.";
  }
  if (device) {
    try {
      const results = await sophos<Page<ScanResult>>(session, `/mobile/v1/devices/${id}/scan-results`, {
        query: { pageSize: 20 },
      });
      scans = results.items ?? [];
    } catch (caught) {
      if (!(caught instanceof SophosError && (caught.status === 404 || caught.status === 403))) {
        error = caught instanceof SophosError ? caught.message : error;
      }
    }
  }

  if (!device) {
    return (
      <div>
        <BackLink href="/phones">Phones</BackLink>
        <Banner tone="bad">{error || "This phone could not be loaded."}</Banner>
      </div>
    );
  }

  const actions = device.availableActions;

  return (
    <div className="stack">
      <BackLink href="/phones">Phones</BackLink>
      <PageHeader title={device.name || "Phone"} lede={device.user?.name || device.user?.email || device.description} />
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <dl className="facts">
        <Fact label="Platform">{labelize(device.platform || device.osName)}</Fact>
        <Fact label="Model">{device.modelName || "Unknown"}</Fact>
        <Fact label="State">{labelize(device.managedState)}</Fact>
        <Fact label="Ownership">{labelize(device.ownershipType, "Unknown")}</Fact>
        <Fact label="Last seen">{formatWhen(device.lastSeenAt)}</Fact>
        <Fact label="Compliant">{device.compliant === false ? "No" : device.compliant ? "Yes" : "Unknown"}</Fact>
      </dl>
      <section className="card stack">
        <h2>Actions</h2>
        {actionAvailable(actions, "sync") ? (
          <InlineForm action={mobileAction} hidden={{ id, action: "sync" }}>
            <SubmitButton pendingLabel="Sending…">Sync</SubmitButton>
          </InlineForm>
        ) : null}
        {actionAvailable(actions, "scan") ? (
          <InlineForm action={mobileAction} hidden={{ id, action: "scan" }}>
            <SubmitButton pendingLabel="Sending…">Scan</SubmitButton>
          </InlineForm>
        ) : null}
        {actionAvailable(actions, "locate") ? (
          <InlineForm action={mobileAction} hidden={{ id, action: "locate" }}>
            <SubmitButton pendingLabel="Sending…">Locate</SubmitButton>
          </InlineForm>
        ) : null}
        {actionAvailable(actions, "lock") ? (
          <InlineForm action={mobileAction} hidden={{ id, action: "lock" }}>
            <label className="field">
              Lock screen message
              <input name="message" maxLength={500} placeholder="Contact IT" />
            </label>
            <label className="field">
              Phone number on the lock screen
              <input name="phone" maxLength={50} inputMode="tel" />
            </label>
            <SubmitButton pendingLabel="Sending…">Lock phone</SubmitButton>
          </InlineForm>
        ) : null}
        {actionAvailable(actions, "send-message") ? (
          <InlineForm action={mobileAction} hidden={{ id, action: "send-message" }}>
            <label className="field">
              Message
              <input name="message" required maxLength={500} />
            </label>
            <SubmitButton pendingLabel="Sending…">Send message</SubmitButton>
          </InlineForm>
        ) : null}
      </section>
      <div className="section-title">
        <h2>Scan results</h2>
      </div>
      <div className="list">
        {scans.length === 0 ? <Empty title="No scan results">A scan from this page will show threats here after Sophos reports them.</Empty> : null}
        {scans.map((scan, index) => (
          <article className="item" key={scan.id || `${scan.detectedAt}-${index}`}>
            <span className="item-main">
              <span className="item-title">{scan.threatName || scan.name || "Finding"}</span>
              <span className="item-sub">
                {labelize(scan.type)} · {formatWhen(scan.detectedAt)}
              </span>
            </span>
            <Pill tone={scan.type === "threat" ? "high" : "medium"}>{labelize(scan.type, "Finding")}</Pill>
          </article>
        ))}
      </div>
      {actionAvailable(actions, "unenroll") ? (
        <DangerZone
          action={mobileAction}
          hidden={{ id, action: "unenroll" }}
          confirmValue={device.name || "DELETE"}
          warning="This unenrolls the phone from Sophos Mobile."
          button="Unenroll"
        />
      ) : null}
      {actionAvailable(actions, "wipe") ? (
        <DangerZone
          action={mobileAction}
          hidden={{ id, action: "wipe" }}
          confirmValue={device.name || "DELETE"}
          warning="This wipes the phone, or removes the work profile on Android Enterprise."
          button="Wipe phone"
        />
      ) : null}
      <DangerZone
        action={deletePhone}
        hidden={{ id }}
        confirmValue={device.name || "DELETE"}
        warning="This deletes the phone record from Sophos Mobile."
        button="Delete phone record"
      />
    </div>
  );
}
