import { PageHeader } from "@/components/ui";
import { EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { saveCase } from "@/app/product-actions";
import { CASE_SEVERITIES, CASE_TYPES, CASE_WRITE_STATUSES } from "@/lib/products";
import { labelize } from "@/lib/format";

export const metadata = { title: "New case" };

export default function NewCasePage() {
  return (
    <div>
      <PageHeader title="New case" lede="Sophos stores this on the tenant. You can attach detections afterwards in Fusion if you need to." />
      <EditorForm action={saveCase}>
        <label className="field">
          Name
          <input name="name" required maxLength={510} autoComplete="off" />
        </label>
        <label className="field">
          Type
          <select name="type" defaultValue="incident">
            {CASE_TYPES.map((type) => (
              <option key={type} value={type}>
                {labelize(type)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Severity
          <select name="severity" defaultValue="medium">
            {CASE_SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>
                {labelize(severity)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue="new">
            {CASE_WRITE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {labelize(status)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Assignee email
          <input name="assignee" placeholder="Unassigned" autoComplete="off" />
        </label>
        <label className="field">
          Overview
          <textarea name="overview" maxLength={20000} />
        </label>
        <SubmitButton pendingLabel="Creating…">Create case</SubmitButton>
      </EditorForm>
    </div>
  );
}
