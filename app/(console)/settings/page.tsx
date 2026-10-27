import { disconnectAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { BackLink, Fact, PageHeader } from "@/components/ui";
import { regionLabel } from "@/lib/format";
import { deploymentCredentials, requireSession } from "@/lib/session";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireSession();
  const saved = Boolean(deploymentCredentials());
  return (
    <div className="stack">
      <BackLink href="/more">More</BackLink>
      <PageHeader title="Settings" lede="This browser is connected with an API credential." />
      <section className="card">
        <dl className="facts">
          <Fact label="Tenant">{session.tenantId}</Fact>
          <Fact label="Region">{regionLabel(session.dataRegion)}</Fact>
          <Fact label="API host">{session.dataRegion}</Fact>
          <Fact label="Client ID">{session.clientId}</Fact>
        </dl>
      </section>
      {saved ? <p className="banner info">This deployment also has server-side API credentials available on the connect screen.</p> : null}
      <section className="card stack">
        <h2>If this phone is lost</h2>
        <p className="lede">
          Sign out here, then delete the API credential in Sophos Fusion Admin under Global Settings → API Credentials. That
          stops this session even if the cookie is still on the device.
        </p>
        <a className="btn ghost" href="https://central.sophos.com/manage" target="_blank" rel="noreferrer">
          Open Sophos Fusion Admin
        </a>
      </section>
      <form action={disconnectAction}>
        <SubmitButton tone="danger" pendingLabel="Signing out…">
          Sign out
        </SubmitButton>
      </form>
      <p className="fine-print">
        Unofficial companion. Colours and type follow the public Sophos site: navy #0A143A, blue #2006F7, Lexend Exa and Inter.
        Not affiliated with Sophos Ltd.
      </p>
    </div>
  );
}
