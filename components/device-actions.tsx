"use client";

import { useActionState, useState } from "react";
import { scanEndpoint, setIsolation, setTamper } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export function DeviceActions({
  id,
  isolated,
  tamperEnabled,
  tamperSupported,
}: {
  id: string;
  isolated: boolean;
  tamperEnabled: boolean;
  tamperSupported: boolean;
}) {
  const [scanState, scanAction] = useActionState(scanEndpoint, null);
  const [isoState, isoAction] = useActionState(setIsolation, null);
  const [tamperState, tamperAction, tamperPending] = useActionState(setTamper, null);
  const [isolateOpen, setIsolateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <div className="stack">
      <form action={scanAction} className="stack">
        <input type="hidden" name="id" value={id} />
        {scanState?.error ? <p className="form-error">{scanState.error}</p> : null}
        {scanState?.message ? <p className="form-ok">{scanState.message}</p> : null}
        <SubmitButton pendingLabel="Requesting scan…">Scan now</SubmitButton>
      </form>

      {isolateOpen ? (
        <form action={isoAction} className="panel stack">
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="enabled" value={isolated ? "false" : "true"} />
          <p>
            {isolated
              ? "Release this device back onto the network."
              : "Cut this device off from the network while you investigate."}
          </p>
          <label className="field">
            <span>{isolated ? "Note, optional" : "Reason"}</span>
            <textarea name="comment" maxLength={400} required={!isolated} rows={3} placeholder="Why you are changing isolation" />
          </label>
          {isoState?.error ? <p className="form-error">{isoState.error}</p> : null}
          {isoState?.message ? <p className="form-ok">{isoState.message}</p> : null}
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setIsolateOpen(false)}>
              Cancel
            </button>
            <SubmitButton tone={isolated ? "primary" : "danger"} pendingLabel="Sending…">
              {isolated ? "Release" : "Isolate"}
            </SubmitButton>
          </div>
        </form>
      ) : (
        <button type="button" className={`btn block ${isolated ? "primary" : "danger"}`} onClick={() => setIsolateOpen(true)}>
          {isolated ? "Release isolation" : "Isolate device"}
        </button>
      )}

      {tamperSupported ? (
        <section className="panel stack">
          <h2>Tamper protection</h2>
          <p className="lede">
            {tamperEnabled ? "On for this device." : "Off for this device."} It can be turned on here only when it is already on for the whole tenant.
          </p>
          <form action={tamperAction} className="stack">
            <input type="hidden" name="id" value={id} />
            {tamperState?.error ? <p className="form-error">{tamperState.error}</p> : null}
            {tamperState?.message ? <p className="form-ok">{tamperState.message}</p> : null}
            <div className="row">
              <button className="btn ghost" type="submit" name="mode" value={tamperEnabled ? "off" : "on"} disabled={tamperPending}>
                {tamperPending ? "Updating…" : tamperEnabled ? "Turn off" : "Turn on"}
              </button>
              <button className="btn ghost" type="submit" name="mode" value="regenerate" disabled={tamperPending}>
                New password
              </button>
            </div>
          </form>
          {tamperState?.password ? (
            <div className="secret-reveal">
              <p>Tamper protection password</p>
              <code>{showPassword ? tamperState.password : "••••••••••••"}</code>
              <div className="row">
                <button type="button" className="btn ghost" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
                <button
                  type="button"
                  className="btn ghost"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(tamperState.password || "");
                      setCopied(true);
                    } catch {
                      setShowPassword(true);
                      setCopied(false);
                    }
                  }}
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="lede">This device does not support tamper protection.</p>
      )}
    </div>
  );
}
