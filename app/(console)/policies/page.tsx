import { Banner, Empty, PageHeader, Pager, Pill } from "@/components/ui";
import { EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { savePolicy } from "@/app/product-actions";
import { first, hrefWith, labelize, pageNumber } from "@/lib/format";
import { POLICY_TYPES, type Policy } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import type { Page } from "@/lib/types";
import { oneOf } from "@/lib/validate";

export const metadata = { title: "Policies" };

export default async function PoliciesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const type = oneOf(first(params.type), POLICY_TYPES);
  const pageNumberValue = pageNumber(first(params.page));
  const session = await requireSession();

  let page: Page<Policy> | null = null;
  let error: string | null = null;
  try {
    page = await sophos<Page<Policy>>(session, "/endpoint/v1/policies", {
      query: { page: pageNumberValue, pageSize: 25, pageTotal: true, policyType: type },
    });
  } catch (caught) {
    error = caught instanceof SophosError ? caught.message : "Policies could not be loaded.";
  }

  const items = page?.items ?? [];
  const hasNext = typeof page?.pages?.total === "number" ? pageNumberValue < page.pages.total : items.length === 25;

  return (
    <div className="stack">
      <PageHeader title="Policies" lede="Endpoint and server policies. Open one to rename it, turn it on, or change a setting." />
      {error ? <Banner tone="bad">{error}</Banner> : null}
      <form className="card stack" method="get">
        <label className="field">
          Policy type
          <select name="type" defaultValue={type || ""}>
            <option value="">All types</option>
            {POLICY_TYPES.map((item) => (
              <option key={item} value={item}>
                {labelize(item)}
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary" type="submit">
          Show policies
        </button>
      </form>
      <section className="card stack">
        <h2>New policy</h2>
        <EditorForm action={savePolicy}>
          <label className="field">
            Name
            <input name="name" required maxLength={100} />
          </label>
          <label className="field">
            Type
            <select name="type" defaultValue="threat-protection">
              {POLICY_TYPES.map((item) => (
                <option key={item} value={item}>
                  {labelize(item)}
                </option>
              ))}
            </select>
          </label>
          <input type="hidden" name="enabled" value="true" />
          <SubmitButton pendingLabel="Creating…">Create policy</SubmitButton>
        </EditorForm>
      </section>
      <div className="list">
        {items.length === 0 && !error ? <Empty title="No policies of this type">Choose another type, or create one.</Empty> : null}
        {items.map((policy) => (
          <a className="item" key={policy.id} href={`/policies/${policy.id}`}>
            <span className="item-main">
              <span className="item-title">{policy.name || "Unnamed policy"}</span>
              <span className="item-sub">{labelize(policy.type)} · priority {policy.priority ?? "—"}</span>
            </span>
            <Pill tone={policy.enabled === false ? "low" : "good"}>{policy.enabled === false ? "Off" : "On"}</Pill>
          </a>
        ))}
      </div>
      <Pager
        prevHref={pageNumberValue > 1 ? hrefWith("/policies", { type, page: String(pageNumberValue - 1) }) : undefined}
        nextHref={hasNext ? hrefWith("/policies", { type, page: String(pageNumberValue + 1) }) : undefined}
      />
    </div>
  );
}
