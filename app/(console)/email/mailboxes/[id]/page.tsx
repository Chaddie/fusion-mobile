import { notFound } from "next/navigation";
import { BackLink, Banner, Fact, PageHeader } from "@/components/ui";
import { DangerZone, EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { deleteMailbox, saveMailbox } from "@/app/product-actions";
import { mailboxAddress, type Mailbox } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import { isUuid } from "@/lib/validate";

export const metadata = { title: "Mailbox" };

export default async function MailboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await requireSession();

  let mailbox: Mailbox | null = null;
  let error: string | null = null;
  try {
    mailbox = await sophos<Mailbox>(session, `/email/v1/mailboxes/${id}`);
  } catch (caught) {
    if (caught instanceof SophosError && caught.status === 404) notFound();
    error = caught instanceof SophosError ? caught.message : "This mailbox could not be loaded.";
  }

  if (!mailbox) {
    return (
      <div>
        <BackLink href="/email">Email</BackLink>
        <Banner tone="bad">{error || "This mailbox could not be loaded."}</Banner>
      </div>
    );
  }

  const address = mailboxAddress(mailbox);

  return (
    <div className="stack">
      <BackLink href="/email">Email</BackLink>
      <PageHeader title={mailbox.name || address} lede={address} />
      <dl className="facts">
        <Fact label="Type">{mailbox.type || "Mailbox"}</Fact>
        <Fact label="Address">{address}</Fact>
      </dl>
      <section className="card stack">
        <h2>Rename</h2>
        <EditorForm action={saveMailbox} hidden={{ id }}>
          <label className="field">
            Name
            <input name="name" required maxLength={255} defaultValue={mailbox.name || ""} />
          </label>
          <SubmitButton pendingLabel="Saving…">Save mailbox</SubmitButton>
        </EditorForm>
      </section>
      <DangerZone
        action={deleteMailbox}
        hidden={{ id }}
        confirmValue={address === "No address" ? mailbox.name || "DELETE" : address}
        warning="This deletes the mailbox from Sophos Email."
        button="Delete mailbox"
      />
    </div>
  );
}
