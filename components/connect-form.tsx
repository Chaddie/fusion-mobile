"use client";

import { useActionState, useState } from "react";
import { connectAction, connectWithDeploymentAction } from "@/app/actions";
import { Mark } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export function ConnectForm({
  hasDeploymentCredentials,
  notice,
}: {
  hasDeploymentCredentials: boolean;
  notice?: string;
}) {
  const [state, action, pending] = useActionState(connectAction, null);
  const [showSecret, setShowSecret] = useState(false);
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");

  return (
    <div className="connect">
      <section className="hero">
        <div className="hero-inner">
          <div className="brand-lockup">
            <Mark size={48} />
            <div>
              <p className="eyebrow">Sophos Fusion</p>
              <p className="wordmark">
                Fusion <span>Mobile</span>
              </p>
            </div>
          </div>
          <h1>Your tenant, built for a phone.</h1>
          <p className="hero-copy">
            Alerts, cases, policies, devices, phones, email, and firewalls, without the desktop console.
          </p>
          <ul className="hero-points">
            <li>Act on alerts and cases</li>
            <li>Change policies and quarantine</li>
            <li>Work with devices, phones, and firewalls</li>
          </ul>
        </div>
      </section>
      <section className="sheet">
        <div className="sheet-inner">
          <h2>Connect a tenant</h2>
          <p className="lede">
            In Sophos Fusion Admin, open Global Settings, then API Credentials. Add a credential and paste both values
            here. They stay in an encrypted cookie on this browser.
          </p>
          {notice ? <p className="banner bad" role="alert">{notice}</p> : null}
          {state?.error ? <p className="banner bad" role="alert">{state.error}</p> : null}
          <form action={action} className="stack">
            <label className="field">
              <span>Client ID</span>
              <input
                name="clientId"
                value={clientId}
                onChange={(event) => setClientId(event.target.value)}
                autoComplete="off"
                inputMode="text"
                spellCheck={false}
                placeholder="57ca9a6b-885f-4e36-95ec-290548c26059"
                required
                disabled={pending}
              />
            </label>
            <div className="field">
              <label htmlFor="client-secret">Client secret</label>
              <span className="secret-row">
                <input
                  id="client-secret"
                  name="clientSecret"
                  value={clientSecret}
                  onChange={(event) => setClientSecret(event.target.value)}
                  type={showSecret ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  required
                  disabled={pending}
                />
                <button type="button" className="btn ghost" onClick={() => setShowSecret((value) => !value)}>
                  {showSecret ? "Hide" : "Show"}
                </button>
              </span>
            </div>
            <SubmitButton pendingLabel="Connecting…">Connect tenant</SubmitButton>
          </form>
          {hasDeploymentCredentials ? (
            <form action={connectWithDeploymentAction}>
              <SubmitButton tone="ghost" pendingLabel="Connecting…">
                Use saved deployment credentials
              </SubmitButton>
            </form>
          ) : null}
          <p className="fine-print">
            Unofficial companion for your own tenant. Not affiliated with Sophos Ltd. API use follows the{" "}
            <a href="https://developer.sophos.com/getting-started-tenant/" target="_blank" rel="noreferrer">
              Sophos Fusion API
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
