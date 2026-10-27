import { PageHeader } from "@/components/ui";
import { EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { saveMailbox } from "@/app/product-actions";

export const metadata = { title: "New mailbox" };

export default function NewMailboxPage() {
  return (
    <div>
      <PageHeader title="New mailbox" lede="Creates a user mailbox in Sophos Email." />
      <EditorForm action={saveMailbox}>
        <label className="field">
          Name
          <input name="name" required maxLength={255} autoComplete="off" />
        </label>
        <label className="field">
          Email
          <input name="email" type="email" required autoComplete="off" />
        </label>
        <SubmitButton pendingLabel="Creating…">Create mailbox</SubmitButton>
      </EditorForm>
    </div>
  );
}
