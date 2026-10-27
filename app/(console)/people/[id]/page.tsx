import { notFound } from "next/navigation";
import { deletePerson, savePerson } from "@/app/actions";
import { DangerZone, EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { BackLink, Fact, PageHeader, Pill } from "@/components/ui";
import { SOURCE_LABELS } from "@/lib/constants";
import { formatWhen, labelize } from "@/lib/format";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { DirectoryUser, Page, UserGroup } from "@/lib/types";
import { isUuid } from "@/lib/validate";

export const metadata = { title: "Person" };

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await requireSession();
  let person: DirectoryUser;
  try {
    person = await sophos<DirectoryUser>(session, `/common/v1/directory/users/${id}`);
  } catch (error) {
    if (error instanceof SophosError && error.status === 404) notFound();
    throw error;
  }

  let groups: UserGroup[] = [];
  try {
    const page = await sophos<Page<UserGroup>>(session, `/common/v1/directory/users/${id}/groups`, { query: { pageSize: 50 } });
    groups = page.items ?? [];
  } catch {
    groups = (person.groups?.items ?? []).map((group) => ({ id: group.id || "", name: group.name || group.displayName }));
  }

  const locked = Boolean(person.source?.type && person.source.type !== "custom");
  const source = person.source?.type ? SOURCE_LABELS[person.source.type as keyof typeof SOURCE_LABELS] || labelize(person.source.type) : "Unknown";

  return (
    <div className="stack">
      <BackLink href="/people">People</BackLink>
      <PageHeader title={person.name || "Person"} lede={person.email || "No email"} />
      <Pill>{source}</Pill>
      <section className="card">
        <dl className="facts">
          {person.exchangeLogin ? <Fact label="Exchange login">{person.exchangeLogin}</Fact> : null}
          {person.domain ? <Fact label="Domain">{person.domain}</Fact> : null}
          <Fact label="Created">{formatWhen(person.createdAt)}</Fact>
          <Fact label="Updated">{formatWhen(person.updatedAt)}</Fact>
        </dl>
      </section>

      {locked ? (
        <p className="banner info">This person is synced from {source}. Change the record in that directory, then let Sophos sync.</p>
      ) : (
        <section className="card">
          <EditorForm action={savePerson} hidden={{ id: person.id }}>
            <label className="field">
              <span>Full name</span>
              <input name="name" required maxLength={250} defaultValue={person.name || ""} />
            </label>
            <label className="field">
              <span>First name</span>
              <input name="firstName" maxLength={250} defaultValue={person.firstName || ""} />
            </label>
            <label className="field">
              <span>Last name</span>
              <input name="lastName" maxLength={250} defaultValue={person.lastName || ""} />
            </label>
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" defaultValue={person.email || ""} />
            </label>
            <p className="lede">Changing the email can lock out a Sophos admin who signs in with the old address.</p>
            <label className="field">
              <span>Exchange login</span>
              <input name="exchangeLogin" maxLength={350} defaultValue={person.exchangeLogin || ""} />
            </label>
            <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
          </EditorForm>
        </section>
      )}

      <section className="stack">
        <h2>Groups</h2>
        {groups.filter((group) => group.id).length === 0 ? <p className="lede">Not in a directory group yet.</p> : null}
        <div className="list">
          {groups
            .filter((group) => group.id)
            .map((group) => (
              <a className="item" key={group.id} href={`/groups/${group.id}`}>
                <span className="item-title">{group.name || group.displayName || "Group"}</span>
              </a>
            ))}
        </div>
      </section>

      {locked ? null : (
        <DangerZone
          action={deletePerson}
          hidden={{ id: person.id }}
          confirmValue={person.name || "DELETE"}
          button="Delete person"
          warning="This deletes the custom directory user from Sophos."
        />
      )}
    </div>
  );
}
