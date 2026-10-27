"use client";

import { useActionState, useState } from "react";
import type { ActionState } from "@/lib/types";
import { SubmitButton } from "@/components/submit-button";

export function InlineForm({
  action,
  hidden,
  children,
  className,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  hidden?: Record<string, string>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className ?? "inline-form"}>
      {hidden
        ? Object.entries(hidden).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)
        : null}
      {children}
      {state?.error ? <p className="form-error">{state.error}</p> : null}
      {state?.message ? <p className="form-ok">{state.message}</p> : null}
    </form>
  );
}

export function EditorForm({
  action,
  hidden,
  children,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  hidden?: Record<string, string>;
  children: React.ReactNode;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="stack">
      {hidden
        ? Object.entries(hidden).map(([key, value]) => <input key={key} type="hidden" name={key} value={value} />)
        : null}
      {state?.error ? (
        <p className="banner bad" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p className="banner good" role="status">
          {state.message}
        </p>
      ) : null}
      {children}
    </form>
  );
}

export function DangerZone({
  action,
  hidden,
  confirmValue,
  warning,
  button,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  hidden: Record<string, string>;
  confirmValue: string;
  warning: string;
  button: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, null);
  if (!open) {
    return (
      <button type="button" className="btn danger block" onClick={() => setOpen(true)}>
        {button}
      </button>
    );
  }
  return (
    <form action={formAction} className="danger-zone stack">
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <p>{warning}</p>
      <label className="field">
        <span>
          Type <strong>{confirmValue}</strong> to confirm
        </span>
        <input name="confirm" autoComplete="off" required />
      </label>
      {state?.error ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      <div className="row">
        <button type="button" className="btn ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </button>
        <SubmitButton tone="danger" pendingLabel="Deleting…">
          Delete
        </SubmitButton>
      </div>
    </form>
  );
}
