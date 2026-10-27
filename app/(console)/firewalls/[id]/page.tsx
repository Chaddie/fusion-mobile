import { notFound } from "next/navigation";
import { BackLink, Banner, Fact, PageHeader } from "@/components/ui";
import { DangerZone, EditorForm } from "@/components/forms";
import { SubmitButton } from "@/components/submit-button";
import { deleteFirewall, saveFirewall } from "@/app/product-actions";
import type { Firewall } from "@/lib/products";
import { SophosError, sophos } from "@/lib/sophos";
import { requireSession } from "@/lib/session";
import { isUuid } from "@/lib/validate";

export const metadata = { title: "Firewall" };

export default async function FirewallPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const session = await requireSession();

  let firewall: Firewall | null = null;
  let error: string | null = null;
  try {
    firewall = await sophos<Firewall>(session, `/firewall/v1/firewalls/${id}`);
  } catch (caught) {
    if (caught instanceof SophosError && caught.status === 404) notFound();
    error = caught instanceof SophosError ? caught.message : "This firewall could not be loaded.";
  }

  if (!firewall) {
    return (
      <div>
        <BackLink href="/firewalls">Firewalls</BackLink>
        <Banner tone="bad">{error || "This firewall could not be loaded."}</Banner>
      </div>
    );
  }

  const title = firewall.name || firewall.hostname || "Firewall";
  const managing = firewall.status?.managingStatus || firewall.status?.managing;

  return (
    <div className="stack">
      <BackLink href="/firewalls">Firewalls</BackLink>
      <PageHeader title={title} lede={firewall.hostname} />
      <dl className="facts">
        <Fact label="Serial">{firewall.serialNumber || "Unknown"}</Fact>
        <Fact label="Model">{firewall.model || "Unknown"}</Fact>
        <Fact label="Firmware">{firewall.firmwareVersion || "Unknown"}</Fact>
        <Fact label="Connection">{firewall.status?.connected === false ? "Offline" : "Online"}</Fact>
        <Fact label="Managing">{managing || "Unknown"}</Fact>
        <Fact label="Group">{firewall.group?.name || "Ungrouped"}</Fact>
        <Fact label="Addresses">{firewall.externalIpv4Addresses?.join(", ") || "None listed"}</Fact>
      </dl>
      <section className="card stack">
        <h2>Rename</h2>
        <EditorForm action={saveFirewall} hidden={{ id }}>
          <label className="field">
            Name
            <input name="name" required minLength={3} maxLength={40} defaultValue={firewall.name || ""} />
          </label>
          <SubmitButton pendingLabel="Saving…">Save name</SubmitButton>
        </EditorForm>
      </section>
      <DangerZone
        action={deleteFirewall}
        hidden={{ id }}
        confirmValue={title}
        warning="This removes the firewall from the tenant. The appliance itself is not wiped."
        button="Delete firewall"
      />
    </div>
  );
}
