import { saveUserGroup } from "@/app/actions";
import { EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { BackLink, PageHeader } from "@/components/ui";

export const metadata = { title: "New people group" };

export default function NewGroupPage() {
  return (
    <div className="stack">
      <BackLink href="/groups">People groups</BackLink>
      <PageHeader title="New group" lede="Creates a custom directory group." />
      <EditorForm action={saveUserGroup}>
        <label className="field">
          <span>Name</span>
          <input name="name" required maxLength={250} />
        </label>
        <label className="field">
          <span>Description</span>
          <textarea name="description" maxLength={1000} rows={3} />
        </label>
        <SubmitButton pendingLabel="Creating…">Create group</SubmitButton>
      </EditorForm>
    </div>
  );
}
