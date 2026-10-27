import { notFound } from "next/navigation";
import { BackLink, Banner, Empty, Fact, PageHeader, Pill } from "@/components/ui";
import { DangerZone, EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { deleteCase, saveCase } from "@/app/product-actions";
import { formatWhen, labelize } from "@/lib/format";
import {
  assigneeLabel,
  CASE_SEVERITIES,
  CASE_TYPES,
  CASE_WRITE_STATUSES,
  type CaseRecord,
  type Detection,
} from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Page } from "@/lib/types";
import { isCaseId } from "@/lib/validate";

export const metadata = { title: "Case" };

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isCaseId(id)) notFound();
  const session = await requireSession();

  let record: CaseRecord | null = null;
  let detections: Detection[] = [];
  let error: string | null = null;
  try {
    record = await sophos<CaseRecord>(session, `/cases/v1/cases/${id}`);
    const listed = await sophos<Page<Detection>>(session, `/cases/v1/cases/${id}/detections`, {
      query: { pageSize: 50 },
    });
    detections = listed.items ?? [];
  } catch (caught) {
    if (caught instanceof SophosError && caught.status === 404) notFound();
    error = caught instanceof SophosError ? caught.message : "This case could not be loaded.";
  }

  if (!record) {
    return (
      <div>
        <BackLink href="/cases">Cases</BackLink>
        <Banner tone="bad">{error || "This case could not be loaded."}</Banner>
      </div>
    );
  }

  const assignee = typeof record.assignee === "string" ? record.assignee : record.assignee?.email || "";
  const writable = CASE_WRITE_STATUSES.includes(record.status as (typeof CASE_WRITE_STATUSES)[number]);

  return (
    <div className="stack">
      <BackLink href="/cases">Cases</BackLink>
      <PageHeader title={record.name || "Untitled case"} lede={`${labelize(record.type)} · ${assigneeLabel(record.assignee)}`} />
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <dl className="facts">
        <Fact label="Status">{labelize(record.status)}</Fact>
        <Fact label="Severity">{labelize(record.severity)}</Fact>
        <Fact label="Opened">{formatWhen(record.createdAt)}</Fact>
        <Fact label="Verdict">{labelize(record.verdict, "Not set")}</Fact>
      </dl>
      {record.overview ? <p className="card">{record.overview}</p> : null}

      <section className="card stack">
        <h2>Update</h2>
        <EditorForm action={saveCase} hidden={{ id }}>
          <label className="field">
            Name
            <input name="name" required maxLength={510} defaultValue={record.name || ""} />
          </label>
          <label className="field">
            Type
            <select name="type" defaultValue={record.type || "incident"}>
              {CASE_TYPES.map((type) => (
                <option key={type} value={type}>
                  {labelize(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Severity
            <select name="severity" defaultValue={record.severity || "medium"}>
              {CASE_SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>
                  {labelize(severity)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Status
            <select name="status" defaultValue={writable ? record.status : "investigating"}>
              {CASE_WRITE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {labelize(status)}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Assignee email
            <input name="assignee" defaultValue={assignee} placeholder="Unassigned" />
          </label>
          <label className="field">
            Overview
            <textarea name="overview" maxLength={20000} defaultValue={record.overview || ""} />
          </label>
          <SubmitButton pendingLabel="Saving…">Save case</SubmitButton>
        </EditorForm>
      </section>

      <div className="section-title">
        <h2>Detections</h2>
      </div>
      <div className="list">
        {detections.length === 0 ? <Empty title="No detections on this case">Sophos will list them here when the case has some.</Empty> : null}
        {detections.map((detection) => (
          <a className="item" key={detection.id} href={`/cases/${id}/detections/${detection.id}`}>
            <span className="item-main">
              <span className="item-title">{detection.detectionName || detection.name || "Detection"}</span>
              <span className="item-sub">
                {labelize(detection.sensor?.type || detection.attackType)} · {formatWhen(detection.time || detection.sensorGeneratedAt)}
              </span>
            </span>
            <Pill tone={Number(detection.severity) >= 7 ? "high" : "medium"}>{String(detection.severity ?? "—")}</Pill>
          </a>
        ))}
      </div>

      <DangerZone
        action={deleteCase}
        hidden={{ id }}
        confirmValue={record.name || "DELETE"}
        warning="This deletes the case in Sophos. Detections themselves stay in the tenant."
        button="Delete case"
      />
    </div>
  );
}
