import { ConnectForm } from "@/components/connect-form";
import { deploymentCredentials, getSession, secretConfigured } from "@/lib/session";
import { disconnectAction } from "@/app/actions";
import { first, regionLabel, shortId } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";

export const dynamic = "force-dynamic";

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const queryError = first(params.error);
  const notice = !secretConfigured()
    ? "This deployment needs a SESSION_SECRET of at least 32 characters before anyone can connect."
    : queryError === "missing-deployment-credentials"
      ? "Saved deployment credentials are missing or the client ID is not a UUID."
      : queryError;

  const session = await getSession();
  if (session) {
    return (
      <main className="connect">
        <section className="hero">
          <div className="hero-inner">
            <p className="eyebrow">Connected</p>
            <h1>This browser is signed in.</h1>
            <p className="hero-copy">
              Tenant {shortId(session.tenantId)} · {regionLabel(session.dataRegion)}
            </p>
          </div>
        </section>
        <section className="sheet">
          <div className="sheet-inner stack">
            <a className="btn primary" href="/home">
              Open the console
            </a>
            <form action={disconnectAction}>
              <SubmitButton tone="ghost" pendingLabel="Signing out…">
                Sign out
              </SubmitButton>
            </form>
          </div>
        </section>
      </main>
    );
  }

  return <ConnectForm hasDeploymentCredentials={Boolean(deploymentCredentials())} notice={notice} />;
}
