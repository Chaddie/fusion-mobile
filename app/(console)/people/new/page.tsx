import { savePerson } from "@/app/actions";
import { EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { BackLink, PageHeader } from "@/components/ui";

export const metadata = { title: "New person" };

export default function NewPersonPage() {
  return (
    <div className="stack">
      <BackLink href="/people">People</BackLink>
      <PageHeader title="New person" lede="Creates a custom directory user in Sophos." />
      <EditorForm action={savePerson}>
        <label className="field">
          <span>Full name</span>
          <input name="name" required maxLength={250} autoComplete="name" />
        </label>
        <label className="field">
          <span>First name</span>
          <input name="firstName" maxLength={250} autoComplete="given-name" />
        </label>
        <label className="field">
          <span>Last name</span>
          <input name="lastName" maxLength={250} autoComplete="family-name" />
        </label>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" />
        </label>
        <label className="field">
          <span>Exchange login</span>
          <input name="exchangeLogin" maxLength={350} autoComplete="off" />
        </label>
        <SubmitButton pendingLabel="Saving…">Create person</SubmitButton>
      </EditorForm>
    </div>
  );
}
