import { Banner, Empty, PageHeader, Pager, Pill } from "@/components/ui";
import { first, hrefWith, pageNumber, searchTerm } from "@/lib/format";
import { mailboxAddress, type Mailbox } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Page } from "@/lib/types";

export const metadata = { title: "Email" };

export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pageNumberValue = pageNumber(first(params.page));
  const search = searchTerm(first(params.q));
  const session = await requireSession();

  let page: Page<Mailbox> | null = null;
  let error: string | null = null;
  try {
    page = await sophos<Page<Mailbox>>(session, "/email/v1/mailboxes", {
      query: { page: pageNumberValue, pageSize: 25, pageTotal: true, search },
    });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "Mailboxes could not be loaded.";
  }

  const items = page?.items ?? [];
  const hasNext = typeof page?.pages?.total === "number" ? pageNumberValue < page.pages.total : items.length === 25;

  return (
    <div>
      <PageHeader
        title="Email"
        lede="Mailboxes in Sophos Email, plus the quarantine."
        action={
          <a className="btn primary" href="/email/mailboxes/new">
            Add
          </a>
        }
      />
      <p className="fine-print">
        <a href="/email/quarantine">Open quarantine</a>
      </p>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <div className="list">
        {items.length === 0 && !error ? <Empty title="No mailboxes">Add one, or connect a tenant that uses Sophos Email.</Empty> : null}
        {items.map((mailbox) => (
          <a className="item" key={mailbox.id} href={`/email/mailboxes/${mailbox.id}`}>
            <span className="item-main">
              <span className="item-title">{mailbox.name || mailboxAddress(mailbox)}</span>
              <span className="item-sub">{mailboxAddress(mailbox)}</span>
            </span>
            <Pill>{mailbox.type || "Mailbox"}</Pill>
          </a>
        ))}
      </div>
      <Pager
        prevHref={pageNumberValue > 1 ? hrefWith("/email", { q: search, page: String(pageNumberValue - 1) }) : undefined}
        nextHref={hasNext ? hrefWith("/email", { q: search, page: String(pageNumberValue + 1) }) : undefined}
      />
    </div>
  );
}
