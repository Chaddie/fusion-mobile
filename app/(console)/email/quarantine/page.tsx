import { BackLink, Banner, Empty, PageHeader, Pager, Pill } from "@/components/ui";
import { DangerZone, InlineForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { quarantineAction } from "@/app/product-actions";
import { first, formatWhen, hrefWith, labelize, pageKey } from "@/lib/format";
import type { QuarantineMessage } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Page } from "@/lib/types";
import { isUuid, oneOf, searchTerm } from "@/lib/validate";

export const metadata = { title: "Quarantine" };

const RANGES = ["1", "7", "30"] as const;

function recipient(message: QuarantineMessage): string {
  if (Array.isArray(message.to)) return message.to.join(", ");
  return message.to || message.forRecipient || "Unknown recipient";
}

function reason(message: QuarantineMessage): string {
  if (Array.isArray(message.reason)) return message.reason.map((item) => labelize(item)).join(", ");
  return labelize(message.reason, "Quarantine");
}

export default async function QuarantinePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const range = oneOf(first(params.range), RANGES) || "7";
  const subject = searchTerm(first(params.q));
  const cursor = pageKey(first(params.pageFromKey));
  const session = await requireSession();
  const end = new Date();
  const begin = new Date(end.getTime() - Number(range) * 24 * 60 * 60 * 1000);

  let page: Page<QuarantineMessage> | null = null;
  let error: string | null = null;
  try {
    page = await sophos<Page<QuarantineMessage>>(session, "/email/v1/quarantine/messages/search", {
      method: "POST",
      body: {
        beginDate: begin.toISOString(),
        endDate: end.toISOString(),
        pageSize: 25,
        pageFromKey: cursor,
        sort: ["quarantinedAt:DESC"],
        ...(subject ? { filter: { subjectContains: subject } } : {}),
      },
    });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "Quarantine could not be loaded.";
  }

  const items = page?.items ?? [];
  const keep = { range, q: subject };

  return (
    <div className="stack">
      <BackLink href="/email">Email</BackLink>
      <PageHeader title="Quarantine" lede="Messages Sophos Email held. Release sends them on. Delete removes them from quarantine." />
      <form className="search" action="/email/quarantine" method="get">
        <input type="hidden" name="range" value={range} />
        <label className="sr-only" htmlFor="quarantine-search">
          Subject contains
        </label>
        <input id="quarantine-search" name="q" defaultValue={subject || ""} placeholder="Subject contains" />
        <button className="btn primary" type="submit">
          Search
        </button>
      </form>
      <div className="chips" aria-label="Date range">
        {RANGES.map((item) => (
          <a key={item} href={hrefWith("/email/quarantine", { range: item, q: subject })} aria-current={item === range ? "page" : undefined}>
            {item === "1" ? "1 day" : `${item} days`}
          </a>
        ))}
      </div>
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <div className="list">
        {items.length === 0 && !error ? <Empty title="Nothing in quarantine">Try a longer range, or a different subject.</Empty> : null}
        {items.map((message) => (
          <article className="card stack" key={message.id}>
            <div>
              <strong>{message.subject || "(No subject)"}</strong>
              <p className="item-sub">
                {message.from || "Unknown sender"} → {recipient(message)}
              </p>
              <p className="item-sub">
                {reason(message)} · {formatWhen(message.quarantinedAt)} · {labelize(message.direction, "Email")}
              </p>
            </div>
            {isUuid(message.id) ? (
              <div className="row">
                <InlineForm action={quarantineAction} hidden={{ id: message.id, action: "release" }}>
                  <SubmitButton pendingLabel="Releasing…">Release</SubmitButton>
                </InlineForm>
                <DangerZone
                  action={quarantineAction}
                  hidden={{ id: message.id, action: "delete" }}
                  confirmValue="DELETE"
                  warning="This deletes the quarantined message. It will not be delivered."
                  button="Delete"
                />
              </div>
            ) : null}
          </article>
        ))}
      </div>
      <Pager
        prevHref={cursor ? hrefWith("/email/quarantine", keep) : undefined}
        nextHref={page?.pages?.nextKey ? hrefWith("/email/quarantine", { ...keep, pageFromKey: page.pages.nextKey }) : undefined}
      />
    </div>
  );
}
