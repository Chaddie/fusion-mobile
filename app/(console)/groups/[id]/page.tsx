import { notFound } from "next/navigation";
import { addUserToGroup, deleteUserGroup, removeUserFromGroup, saveUserGroup } from "@/app/actions";
import { DangerZone, EditorForm, InlineForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { BackLink, PageHeader, Pill, SearchBox } from "@/components/ui";
import { SOURCE_LABELS } from "@/lib/constants";
import { first, labelize, searchTerm } from "@/lib/format";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { DirectoryUser, Page, UserGroup } from "@/lib/types";
import { isUuid } from "@/lib/validate";

export const metadata = { title: "People group" };

export default async function GroupPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const query = searchTerm(first((await searchParams).q));
  const session = await requireSession();

  let group: UserGroup;
  try {
    group = await sophos<UserGroup>(session, `/common/v1/directory/user-groups/${id}`);
  } catch (error) {
    if (error instanceof SophosError && error.status === 404) notFound();
    throw error;
  }

  let members: { id: string; name?: string }[] = [];
  try {
    const page = await sophos<Page<DirectoryUser>>(session, `/common/v1/directory/user-groups/${id}/users`, {
      query: { pageSize: 50, page: 1 },
    });
    members = (page.items ?? []).map((person) => ({ id: person.id, name: person.name }));
  } catch {
    members = (group.users?.items ?? []).flatMap((person) => (person.id ? [{ id: person.id, name: person.name }] : []));
  }

  let candidates: DirectoryUser[] = [];
  if (query && query.length >= 2) {
    try {
      const found = await sophos<Page<DirectoryUser>>(session, "/common/v1/directory/users", {
        query: { search: query, searchFields: ["name", "email"], pageSize: 8 },
      });
      const memberIds = new Set(members.map((member) => member.id));
      candidates = (found.items ?? []).filter((person) => !memberIds.has(person.id));
    } catch {
      candidates = [];
    }
  }

  const locked = Boolean(group.source?.type && group.source.type !== "custom");
  const source = group.source?.type ? SOURCE_LABELS[group.source.type as keyof typeof SOURCE_LABELS] || labelize(group.source.type) : "Custom";

  return (
    <div className="stack">
      <BackLink href="/groups">People groups</BackLink>
      <PageHeader title={group.name || "Group"} lede={group.description || "No description"} />
      <Pill>{source}</Pill>

      {locked ? (
        <p className="banner info">This group is synced from {source}. Membership changes belong in that directory.</p>
      ) : (
        <section className="card">
          <EditorForm action={saveUserGroup} hidden={{ id: group.id }}>
            <label className="field">
              <span>Name</span>
              <input name="name" required maxLength={250} defaultValue={group.name || ""} />
            </label>
            <label className="field">
              <span>Description</span>
              <textarea name="description" maxLength={1000} rows={3} defaultValue={group.description || ""} />
            </label>
            <SubmitButton pendingLabel="Saving…">Save group</SubmitButton>
          </EditorForm>
        </section>
      )}

      <section className="stack">
        <h2>Members</h2>
        {members.length === 0 ? <p className="lede">No members yet.</p> : null}
        <div className="list">
          {members.map((member) => (
            <div className="item member" key={member.id}>
              <a href={`/people/${member.id}`}>{member.name || "Person"}</a>
              {locked ? null : (
                <InlineForm action={removeUserFromGroup} hidden={{ groupId: group.id, userId: member.id }}>
                  <SubmitButton tone="ghost" pendingLabel="Removing…">
                    Remove
                  </SubmitButton>
                </InlineForm>
              )}
            </div>
          ))}
        </div>
      </section>

      {locked ? null : (
        <section className="stack">
          <h2>Add someone</h2>
          <SearchBox action={`/groups/${group.id}`} placeholder="Search people to add" defaultValue={query} />
          <div className="list">
            {candidates.map((person) => (
              <div className="item member" key={person.id}>
                <span className="item-main">
                  <span className="item-title">{person.name}</span>
                  <span className="item-sub">{person.email || "No email"}</span>
                </span>
                <InlineForm action={addUserToGroup} hidden={{ groupId: group.id, userId: person.id }}>
                  <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
                </InlineForm>
              </div>
            ))}
          </div>
        </section>
      )}

      {locked ? null : (
        <DangerZone
          action={deleteUserGroup}
          hidden={{ id: group.id }}
          confirmValue={group.name || "DELETE"}
          button="Delete group"
          warning="Sophos only deletes empty custom groups. Remove members first."
        />
      )}
    </div>
  );
}
