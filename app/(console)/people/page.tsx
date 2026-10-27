import { Banner, Chips, Empty, PageHeader, Pager, Pill, SearchBox } from "@/components/ui";
import { SOURCE_LABELS, SOURCE_TYPES } from "@/lib/constants";
import { first, hrefWith, pageNumber, searchTerm } from "@/lib/format";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { DirectoryUser, Page } from "@/lib/types";
import { sourceOf } from "@/lib/validate";

export const metadata = { title: "People" };

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = searchTerm(first(params.q));
  const source = sourceOf(first(params.source));
  const pageNumberValue = pageNumber(first(params.page));
  const removed = first(params.removed) === "1";
  const session = await requireSession();

  let page: Page<DirectoryUser> | null = null;
  let error: string | null = null;
  try {
    page = await sophos<Page<DirectoryUser>>(session, "/common/v1/directory/users", {
      query: {
        page: pageNumberValue,
        pageSize: 20,
        pageTotal: true,
        search: q,
        searchFields: q ? ["name", "email"] : undefined,
        sourceType: source,
      },
    });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "People could not be loaded.";
  }

  const items = page?.items ?? [];
  const keep = { q, source };
  const hasNext =
    page?.pages?.current && page.pages.total ? page.pages.current < page.pages.total : items.length === 20;

  return (
    <div>
      <PageHeader
        title="People"
        lede="Directory users in this tenant. Custom users can be edited here. Synced users stay managed in their source directory."
        action={
          <a className="btn primary" href="/people/new">
            Add
          </a>
        }
      />
      {removed ? <Banner tone="good">That person was deleted.</Banner> : null}
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <SearchBox action="/people" placeholder="Search name or email" defaultValue={q} hidden={{ source }} />
      <Chips
        path="/people"
        param="source"
        value={source}
        keep={{ q }}
        options={[["", "All"], ...SOURCE_TYPES.map((item) => [item, SOURCE_LABELS[item]] as [string, string])]}
      />
      <div className="list">
        {items.length === 0 && !error ? <Empty title="No people match">Add a custom user, or change the search.</Empty> : null}
        {items.map((person) => (
          <a className="item" key={person.id} href={`/people/${person.id}`}>
            <span className="item-main">
              <span className="item-title">{person.name || "Unnamed"}</span>
              <span className="item-sub">{person.email || "No email"}</span>
            </span>
            <Pill>{person.source?.type ? SOURCE_LABELS[person.source.type as keyof typeof SOURCE_LABELS] || person.source.type : "User"}</Pill>
          </a>
        ))}
      </div>
      <Pager
        prevHref={pageNumberValue > 1 ? hrefWith("/people", { ...keep, page: String(pageNumberValue - 1) }) : undefined}
        nextHref={hasNext ? hrefWith("/people", { ...keep, page: String(pageNumberValue + 1) }) : undefined}
      />
    </div>
  );
}
