import { saveDeviceGroup } from "@/app/actions";
import { EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { BackLink, PageHeader } from "@/components/ui";

export const metadata = { title: "New device group" };

export default function NewDeviceGroupPage() {
  return (
    <div className="stack">
      <BackLink href="/device-groups">Device groups</BackLink>
      <PageHeader title="New device group" lede="Names cannot include # , + quotes, slashes, or angle brackets." />
      <EditorForm action={saveDeviceGroup}>
        <label className="field">
          <span>Name</span>
          <input name="name" required maxLength={250} />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea name="description" maxLength={1000} rows={3} />
        </label>
        <label className="field">
          <span>Type</span>
          <select name="type" defaultValue="computer">
            <option value="computer">Computers</option>
            <option value="server">Servers</option>
          </select>
        </label>
        <SubmitButton pendingLabel="Creating…">Create group</SubmitButton>
      </EditorForm>
    </div>
  );
}
