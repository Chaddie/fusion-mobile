"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  tone = "primary",
  disabled,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  tone?: "primary" | "ghost" | "danger";
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={`btn ${tone}`} type="submit" disabled={pending || disabled}>
      {pending ? pendingLabel : children}
    </button>
  );
}
