import { Banner, Empty, PageHeader, Pager, SearchBox } from "@/components/ui";
import { first, hrefWith, pageNumber, searchTerm } from "@/lib/format";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Page, UserGroup } from "@/lib/types";

export const metadata = { title: "People groups" };

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = searchTerm(first(params.q));
  const pageNumberValue = pageNumber(first(params.page));
  const removed = first(params.removed) === "1";
  const session = await requireSession();
  let page: Page<UserGroup> | null = null;
  let error: string | null = null;
  try {
    page = await sophos<Page<UserGroup>>(session, "/common/v1/directory/user-groups", {
      query: { page: pageNumberValue, pageSize: 20, pageTotal: true, search: q },
    });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "Groups could not be loaded.";
  }
  const items = page?.items ?? [];
  const hasNext = page?.pages?.current && page.pages.total ? page.pages.current < page.pages.total : items.length === 20;

  return (
    <div>
      <PageHeader
        title="People groups"
        lede="Directory groups. Empty custom groups can be deleted."
        action={
          <a className="btn primary" href="/groups/new">
            Add
          </a>
        }
      />
      {removed ? <Banner tone="good">That group was deleted.</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <SearchBox action="/groups" placeholder="Search groups" defaultValue={q} />
      <div className="list">
        {items.length === 0 && !error ? <Empty title="No groups match">Create a custom group, or change the search.</Empty> : null}
        {items.map((group) => (
          <a className="item" key={group.id} href={`/groups/${group.id}`}>
            <span className="item-main">
              <span className="item-title">{group.name || group.displayName || "Group"}</span>
              <span className="item-sub">
                {typeof group.users?.total === "number" ? `${group.users.total} people` : group.description || "Directory group"}
              </span>
            </span>
          </a>
        ))}
      </div>
      <Pager
        prevHref={pageNumberValue > 1 ? hrefWith("/groups", { q, page: String(pageNumberValue - 1) }) : undefined}
        nextHref={hasNext ? hrefWith("/groups", { q, page: String(pageNumberValue + 1) }) : undefined}
      />
    </div>
  );
}
