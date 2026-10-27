import { Banner, Empty, PageHeader, Pager } from "@/components/ui";
import { DangerZone, EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { deleteFirewallGroup, saveFirewallGroup } from "@/app/product-actions";
import { first, hrefWith, pageNumber, searchTerm } from "@/lib/format";
import type { Firewall, FirewallGroup } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Page } from "@/lib/types";

export const metadata = { title: "Firewalls" };

export default async function FirewallsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const pageNumberValue = pageNumber(first(params.page));
  const search = searchTerm(first(params.q));
  const session = await requireSession();

  const [firewallsResult, groupsResult] = await Promise.allSettled([
    sophos<Page<Firewall>>(session, "/firewall/v1/firewalls", {
      query: { page: pageNumberValue, pageSize: 25, pageTotal: true, search },
    }),
    sophos<Page<FirewallGroup>>(session, "/firewall/v1/firewall-groups", { query: { pageSize: 50, pageTotal: true } }),
  ]);

  const page = firewallsResult.status === "fulfilled" ? firewallsResult.value : null;
  const groups = groupsResult.status === "fulfilled" ? groupsResult.value.items ?? [] : [];
  const error =
    firewallsResult.status === "rejected"
      ? firewallsResult.reason instanceof SophosError
        ? firewallsResult.reason.message
        : "Firewalls could not be loaded."
      : null;
  const items = page?.items ?? [];
  const hasNext = typeof page?.pages?.total === "number" ? pageNumberValue < page.pages.total : items.length === 25;

  return (
    <div className="stack">
      <PageHeader title="Firewalls" lede="Sophos Firewall appliances registered to this tenant." />
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <div className="list">
        {items.length === 0 && !error ? <Empty title="No firewalls">Appliances appear here after they are claimed in Sophos Firewall.</Empty> : null}
        {items.map((firewall) => {
          const connected = firewall.status?.connected;
          return (
            <a className="item" key={firewall.id} href={`/firewalls/${firewall.id}`}>
              <span className="item-main">
                <span className="item-title">{firewall.name || firewall.hostname || "Firewall"}</span>
                <span className="item-sub">
                  {firewall.model || "Firewall"} · {firewall.serialNumber || "No serial"} · {connected === false ? "Offline" : "Online"}
                </span>
              </span>
            </a>
          );
        })}
      </div>
      <Pager
        prevHref={pageNumberValue > 1 ? hrefWith("/firewalls", { q: search, page: String(pageNumberValue - 1) }) : undefined}
        nextHref={hasNext ? hrefWith("/firewalls", { q: search, page: String(pageNumberValue + 1) }) : undefined}
      />
      <div className="section-title">
        <h2>Groups</h2>
      </div>
      <section className="card stack">
        <EditorForm action={saveFirewallGroup}>
          <label className="field">
            New group
            <input name="name" required maxLength={80} />
          </label>
          <SubmitButton pendingLabel="Creating…">Create group</SubmitButton>
        </EditorForm>
      </section>
      <div className="list">
        {groups.length === 0 ? <Empty title="No firewall groups">Create one to organise appliances.</Empty> : null}
        {groups.map((group) => (
          <article className="card stack" key={group.id}>
            <strong>{group.name || "Group"}</strong>
            {group.description ? <p className="item-sub">{group.description}</p> : null}
            <DangerZone
              action={deleteFirewallGroup}
              hidden={{ id: group.id }}
              confirmValue="DELETE"
              warning="This deletes the firewall group. Firewalls in it become ungrouped."
              button="Delete group"
            />
          </article>
        ))}
      </div>
    </div>
  );
}
