import { Banner, Chips, Empty, PageHeader, Pager, Pill, SearchBox } from "@/components/ui";
import { first, hrefWith, labelize, pageNumber, searchTerm } from "@/lib/format";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { EndpointGroup, Page } from "@/lib/types";
import { endpointTypeOf } from "@/lib/validate";

export const metadata = { title: "Device groups" };

export default async function DeviceGroupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = searchTerm(first(params.q));
  const type = endpointTypeOf(first(params.type));
  const pageNumberValue = pageNumber(first(params.page));
  const removed = first(params.removed) === "1";
  const session = await requireSession();
  let page: Page<EndpointGroup> | null = null;
  let error: string | null = null;
  try {
    page = await sophos<Page<EndpointGroup>>(session, "/endpoint/v1/endpoint-groups", {
      query: { page: pageNumberValue, pageSize: 20, pageTotal: true, search: q, groupType: type },
    });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "Device groups could not be loaded.";
  }
  const items = page?.items ?? [];
  const hasNext = page?.pages?.current && page.pages.total ? page.pages.current < page.pages.total : items.length === 20;

  return (
    <div>
      <PageHeader
        title="Device groups"
        lede="Group computers and servers. A device can sit in one group."
        action={
          <a className="btn primary" href="/device-groups/new">
            Add
          </a>
        }
      />
      {removed ? <Banner tone="good">That device group was deleted.</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <SearchBox action="/device-groups" placeholder="Search device groups" defaultValue={q} hidden={{ type }} />
      <Chips
        path="/device-groups"
        param="type"
        value={type}
        keep={{ q }}
        options={[
          ["", "All"],
          ["computer", "Computers"],
          ["server", "Servers"],
        ]}
      />
      <div className="list">
        {items.length === 0 && !error ? <Empty title="No device groups match">Create one, or change the search.</Empty> : null}
        {items.map((group) => (
          <a className="item" key={group.id} href={`/device-groups/${group.id}`}>
            <span className="item-main">
              <span className="item-title">{group.name || "Group"}</span>
              <span className="item-sub">
                {typeof group.endpoints?.total === "number" ? `${group.endpoints.total} devices` : group.description || "Device group"}
              </span>
            </span>
            <Pill>{labelize(group.type)}</Pill>
          </a>
        ))}
      </div>
      <Pager
        prevHref={pageNumberValue > 1 ? hrefWith("/device-groups", { q, type, page: String(pageNumberValue - 1) }) : undefined}
        nextHref={hasNext ? hrefWith("/device-groups", { q, type, page: String(pageNumberValue + 1) }) : undefined}
      />
    </div>
  );
}
