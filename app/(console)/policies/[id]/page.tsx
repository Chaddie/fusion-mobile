import { notFound } from "next/navigation";
import { BackLink, Banner, Fact, PageHeader } from "@/components/ui";
import { DangerZone, EditorForm, InlineForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { deletePolicy, savePolicy, savePolicySetting } from "@/app/product-actions";
import { labelize } from "@/lib/format";
import { isBasePolicy, readSetting, type Policy } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import { isUuid } from "@/lib/validate";

export const metadata = { title: "Policy" };

export default async function PolicyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await requireSession();

  let policy: Policy | null = null;
  let error: string | null = null;
  try {
    policy = await sophos<Policy>(session, `/endpoint/v1/policies/${id}`);
    if (!policy.settings || Object.keys(policy.settings).length === 0) {
      try {
        const extra = await sophos<{ settings?: Record<string, unknown> } | Record<string, unknown>>(
          session,
          `/endpoint/v1/policies/${id}/settings`,
        );
        if (extra && typeof extra === "object" && "settings" in extra && extra.settings && typeof extra.settings === "object") {
          policy.settings = extra.settings as Record<string, unknown>;
        } else if (extra && typeof extra === "object" && !("id" in extra)) {
          policy.settings = extra as Record<string, unknown>;
        }
      } catch {
        policy.settings = policy.settings ?? {};
      }
    }
  } catch (caught) {
    if (caught instanceof SophosError && caught.status === 404) notFound();
    error = caught instanceof SophosError ? caught.message : "This policy could not be loaded.";
  }

  if (!policy) {
    return (
      <div>
        <BackLink href="/policies">Policies</BackLink>
        <Banner tone="bad">{error || "This policy could not be loaded."}</Banner>
      </div>
    );
  }

  const locked = policy.lockedByManagingAccount === true;
  const base = isBasePolicy(policy);
  const settings = Object.entries(policy.settings ?? {}).slice(0, 80);

  return (
    <div className="stack">
      <BackLink href="/policies">Policies</BackLink>
      <PageHeader title={policy.name || "Policy"} lede={labelize(policy.type)} />
      {locked ? <Banner>A managing account has locked this policy.</Banner> : null}
      {base ? <Banner>This is a base policy. Only its settings can change.</Banner> : null}
      <dl className="facts">
        <Fact label="Enabled">{policy.enabled === false ? "Off" : "On"}</Fact>
        <Fact label="Priority">{String(policy.priority ?? "—")}</Fact>
      </dl>
      {locked || base ? null : (
        <section className="card stack">
          <h2>Name and status</h2>
          <EditorForm action={savePolicy} hidden={{ id }}>
            <label className="field">
              Name
              <input name="name" required maxLength={100} defaultValue={policy.name || ""} />
            </label>
            <label className="field">
              Enabled
              <select name="enabled" defaultValue={policy.enabled === false ? "false" : "true"}>
                <option value="true">On</option>
                <option value="false">Off</option>
              </select>
            </label>
            <SubmitButton pendingLabel="Saving…">Save policy</SubmitButton>
          </EditorForm>
        </section>
      )}
      <div className="section-title">
        <h2>Settings</h2>
      </div>
      <div className="list">
        {settings.length === 0 ? <p className="card">Sophos did not return individual settings for this policy.</p> : null}
        {settings.map(([key, raw]) => {
          const setting = readSetting(raw);
          const complex = setting.value !== null && typeof setting.value === "object";
          return (
            <article className="item" key={key}>
              <span className="item-main">
                <span className="item-title">{labelize(key.split(".").pop())}</span>
                <span className="item-sub">{key}</span>
                {locked || setting.managed || complex ? (
                  <span className="item-sub">{complex ? "Change this list in Sophos Fusion Admin." : String(setting.value)}</span>
                ) : typeof setting.value === "boolean" ? (
                  <InlineForm
                    action={savePolicySetting}
                    hidden={{ id, key, kind: "boolean", value: setting.value ? "false" : "true" }}
                  >
                    <SubmitButton pendingLabel="Saving…">{setting.value ? "Turn off" : "Turn on"}</SubmitButton>
                  </InlineForm>
                ) : (
                  <EditorForm action={savePolicySetting} hidden={{ id, key, kind: typeof setting.value === "number" ? "number" : "string" }}>
                    <label className="field">
                      Value
                      <input name="value" defaultValue={setting.value == null ? "" : String(setting.value)} maxLength={500} />
                    </label>
                    <SubmitButton pendingLabel="Saving…">Save setting</SubmitButton>
                  </EditorForm>
                )}
              </span>
            </article>
          );
        })}
      </div>
      {locked || base ? null : (
        <DangerZone
          action={deletePolicy}
          hidden={{ id }}
          confirmValue={policy.name || "DELETE"}
          warning="This removes the policy from the tenant. Devices fall back to the next matching policy."
          button="Delete policy"
        />
      )}
    </div>
  );
}
