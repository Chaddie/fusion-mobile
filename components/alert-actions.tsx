"use client";

import { useActionState, useState } from "react";
import { actOnAlert } from "@/app/actions";
import { ALERT_ACTION_LABELS, type AlertAction } from "@/lib/constants";

export function AlertActions({ alertId, actions }: { alertId: string; actions: string[] }) {
  const [state, formAction, pending] = useActionState(actOnAlert, null);
  const [selected, setSelected] = useState(actions[0] ?? "");
  const needsMessage = selected === "sendMsgPua" || selected === "sendMsgThreat";

  if (actions.length === 0) {
    return <p className="lede">Sophos did not offer an action for this alert.</p>;
  }

  return (
    <form action={formAction} className="stack">
      <input type="hidden" name="alertId" value={alertId} />
      <fieldset className="choices">
        <legend>What should Sophos do?</legend>
        {actions.map((action) => (
          <label key={action} className="choice">
            <input
              type="radio"
              name="action"
              value={action}
              checked={selected === action}
              onChange={() => setSelected(action)}
            />
            <span>{ALERT_ACTION_LABELS[action as AlertAction] ?? action}</span>
          </label>
        ))}
      </fieldset>
      {needsMessage ? (
        <label className="field">
          <span>Message</span>
          <textarea name="message" required rows={3} maxLength={500} placeholder="Message to send" />
        </label>
      ) : null}
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.message ? <p className="form-ok">{state.message}</p> : null}
      <button className="btn primary" type="submit" disabled={pending || !selected}>
        {pending ? "Sending…" : "Run action"}
      </button>
    </form>
  );
}
