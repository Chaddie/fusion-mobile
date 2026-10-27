import { notFound } from "next/navigation";
import { addEndpointToGroup, deleteDeviceGroup, removeEndpointFromGroup, saveDeviceGroup } from "@/app/actions";
import { DangerZone, EditorForm, InlineForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { BackLink, PageHeader, Pill, SearchBox } from "@/components/ui";
import { first, labelize, searchTerm } from "@/lib/format";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Endpoint, EndpointGroup, Page } from "@/lib/types";
import { isUuid } from "@/lib/validate";

export const metadata = { title: "Device group" };

export default async function DeviceGroupPage({
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

  let group: EndpointGroup;
  try {
    group = await sophos<EndpointGroup>(session, `/endpoint/v1/endpoint-groups/${id}`);
  } catch (error) {
    if (error instanceof SophosError && error.status === 404) notFound();
    throw error;
  }

  let members: { id: string; hostname?: string }[] = [];
  try {
    const page = await sophos<Page<Endpoint>>(session, `/endpoint/v1/endpoint-groups/${id}/endpoints`, {
      query: { pageSize: 50, view: "basic" },
    });
    members = (page.items ?? []).map((device) => ({ id: device.id, hostname: device.hostname }));
  } catch {
    members = (group.endpoints?.items ?? []).flatMap((device) => (device.id ? [{ id: device.id, hostname: device.hostname }] : []));
  }

  let candidates: Endpoint[] = [];
  if (query && query.length >= 2) {
    try {
      const found = await sophos<Page<Endpoint>>(session, "/endpoint/v1/endpoints", {
        query: { search: query.replace(/[#,+"\\<>;]/g, ""), type: group.type, pageSize: 8, view: "summary" },
      });
      const memberIds = new Set(members.map((member) => member.id));
      candidates = (found.items ?? []).filter((device) => !memberIds.has(device.id));
    } catch {
      candidates = [];
    }
  }

  return (
    <div className="stack">
      <BackLink href="/device-groups">Device groups</BackLink>
      <PageHeader title={group.name || "Device group"} lede={group.description || "No description"} />
      <Pill>{labelize(group.type)}</Pill>
      <section className="card">
        <EditorForm action={saveDeviceGroup} hidden={{ id: group.id }}>
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

      <section className="stack">
        <h2>Devices</h2>
        {members.length === 0 ? <p className="lede">No devices in this group.</p> : null}
        <div className="list">
          {members.map((member) => (
            <div className="item member" key={member.id}>
              <a href={`/devices/${member.id}`}>{member.hostname || "Device"}</a>
              <InlineForm action={removeEndpointFromGroup} hidden={{ groupId: group.id, endpointId: member.id }}>
                <SubmitButton tone="ghost" pendingLabel="Removing…">
                  Remove
                </SubmitButton>
              </InlineForm>
            </div>
          ))}
        </div>
      </section>

      <section className="stack">
        <h2>Add a device</h2>
        <SearchBox action={`/device-groups/${group.id}`} placeholder={`Search ${labelize(group.type).toLowerCase()}s`} defaultValue={query} />
        <div className="list">
          {candidates.map((device) => (
            <div className="item member" key={device.id}>
              <span className="item-title">{device.hostname || "Device"}</span>
              <InlineForm action={addEndpointToGroup} hidden={{ groupId: group.id, endpointId: device.id }}>
                <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
              </InlineForm>
            </div>
          ))}
        </div>
      </section>

      <DangerZone
        action={deleteDeviceGroup}
        hidden={{ id: group.id }}
        confirmValue={group.name || "DELETE"}
        button="Delete group"
        warning="Sophos only deletes empty groups, and it will not delete groups synced from Active Directory."
      />
    </div>
  );
}
