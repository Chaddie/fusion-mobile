"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { SophosError, sophos } from "@/lib/sophos";
import {
  CASE_TYPES,
  CASE_WRITE_STATUSES,
  CASE_SEVERITIES,
  MOBILE_ACTIONS,
  POLICY_TYPES,
  type MobileAction,
  type Policy,
} from "@/lib/products";
import type { ActionState } from "@/lib/types";
import {
  emailOf,
  isCaseId,
  isUuid,
  oneOf,
  optionalText,
  policyNameOf,
  settingKeyOf,
  shortName,
  text,
} from "@/lib/validate";

function failure(error: unknown): ActionState {
  if (error instanceof SophosError) return { error: error.message };
  return { error: "Something went wrong while talking to Sophos." };
}

function settle(error: unknown): ActionState {
  if (typeof error === "object" && error !== null && "digest" in error) {
    const digest = String((error as { digest?: unknown }).digest ?? "");
    if (digest.startsWith("NEXT_")) throw error;
  }
  return failure(error);
}

function matches(confirm: string, expected: string): boolean {
  return confirm.trim() === expected.trim();
}

export async function saveCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const creating = !id;
  if (!creating && !isCaseId(id)) return { error: "That case could not be matched." };
  const name = optionalText(text(formData, "name"), 510);
  if (!name) return { error: "Enter a case name, up to 510 characters." };
  const type = oneOf(text(formData, "type"), CASE_TYPES);
  const severity = oneOf(text(formData, "severity"), CASE_SEVERITIES);
  const status = oneOf(text(formData, "status"), CASE_WRITE_STATUSES);
  if (!type || !severity || !status) return { error: "Choose a type, severity, and status." };
  const overviewRaw = text(formData, "overview");
  const overview = overviewRaw ? optionalText(overviewRaw, 20000) : null;
  if (overviewRaw && !overview) return { error: "Overview must be 20,000 characters or fewer." };
  const assigneeRaw = text(formData, "assignee");
  let assignee = "Unassigned";
  if (assigneeRaw && assigneeRaw.toLowerCase() !== "unassigned") {
    const email = emailOf(assigneeRaw);
    if (!email) return { error: "Assignee must be an email address, or Unassigned." };
    assignee = email;
  }
  const body = { name, type, severity, status, assignee, managedBy: "self", overview: overview ?? undefined };
  try {
    if (creating) {
      const created = await sophos<{ id?: string }>(session, "/cases/v1/cases", { method: "POST", body });
      revalidatePath("/cases");
      revalidatePath("/home");
      if (created.id && isCaseId(created.id)) redirect(`/cases/${created.id}`);
      redirect("/cases");
    }
    await sophos(session, `/cases/v1/cases/${id}`, { method: "PATCH", body });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/cases");
  revalidatePath(`/cases/${id}`);
  return { message: "Case updated." };
}

export async function deleteCase(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  if (!isCaseId(id)) return { error: "That case could not be matched." };
  try {
    const current = await sophos<{ name?: string }>(session, `/cases/v1/cases/${id}`);
    const expected = current.name || "DELETE";
    if (!matches(text(formData, "confirm"), expected)) return { error: `Type “${expected}” to delete this case.` };
    await sophos(session, `/cases/v1/cases/${id}`, { method: "DELETE" });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/cases");
  revalidatePath("/home");
  redirect("/cases");
}

export async function savePolicy(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const creating = !id;
  if (!creating && !isUuid(id)) return { error: "That policy could not be matched." };
  const name = policyNameOf(text(formData, "name"));
  if (!name) return { error: "Enter a policy name, up to 100 characters." };
  const enabled = text(formData, "enabled") === "true";
  try {
    if (creating) {
      const type = oneOf(text(formData, "type"), POLICY_TYPES);
      if (!type) return { error: "Choose a policy type." };
      const created = await sophos<{ id?: string }>(session, "/endpoint/v1/policies", {
        method: "POST",
        body: { name, type, enabled },
      });
      revalidatePath("/policies");
      if (created.id && isUuid(created.id)) redirect(`/policies/${created.id}`);
      redirect("/policies");
    }
    const current = await sophos<Policy>(session, `/endpoint/v1/policies/${id}`);
    if (current.lockedByManagingAccount) return { error: "Sophos has locked this policy. It cannot be changed here." };
    const base = current.priority === 0 || current.name === "Base Policy";
    if (base) return { error: "A base policy only accepts setting changes." };
    await sophos(session, `/endpoint/v1/policies/${id}`, { method: "PATCH", body: { name, enabled } });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/policies");
  revalidatePath(`/policies/${id}`);
  return { message: "Policy updated." };
}

export async function savePolicySetting(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const key = settingKeyOf(text(formData, "key"));
  if (!isUuid(id) || !key) return { error: "That setting could not be matched." };
  const kind = text(formData, "kind");
  let value: boolean | string | number;
  if (kind === "boolean") {
    value = text(formData, "value") === "true";
  } else if (kind === "number") {
    const parsed = Number(text(formData, "value"));
    if (!Number.isFinite(parsed)) return { error: "Enter a number for this setting." };
    value = parsed;
  } else {
    const next = optionalText(text(formData, "value"), 500);
    if (!next) return { error: "Enter a value, up to 500 characters." };
    value = next;
  }
  try {
    const current = await sophos<Policy>(session, `/endpoint/v1/policies/${id}`);
    if (current.lockedByManagingAccount) return { error: "Sophos has locked this policy. It cannot be changed here." };
    const raw = current.settings?.[key];
    if (raw && typeof raw === "object" && !Array.isArray(raw) && (raw as { sophosManaged?: boolean }).sophosManaged) {
      return { error: "Sophos manages this setting." };
    }
    await sophos(session, `/endpoint/v1/policies/${id}`, {
      method: "PATCH",
      body: { settings: { [key]: { value } } },
    });
  } catch (error) {
    return settle(error);
  }
  revalidatePath(`/policies/${id}`);
  return { message: "Setting saved." };
}

export async function deletePolicy(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "That policy could not be matched." };
  try {
    const current = await sophos<Policy>(session, `/endpoint/v1/policies/${id}`);
    if (current.lockedByManagingAccount) return { error: "Sophos has locked this policy." };
    if (current.priority === 0 || current.name === "Base Policy") return { error: "Base policies cannot be deleted." };
    const expected = current.name || "DELETE";
    if (!matches(text(formData, "confirm"), expected)) return { error: `Type “${expected}” to delete this policy.` };
    await sophos(session, `/endpoint/v1/policies/${id}`, { method: "DELETE" });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/policies");
  redirect("/policies");
}

export async function mobileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const action = oneOf(text(formData, "action"), MOBILE_ACTIONS);
  if (!isUuid(id) || !action) return { error: "That phone action is not available." };
  const argumentsBody = mobileArguments(action, formData);
  if ("error" in argumentsBody) return { error: argumentsBody.error };
  try {
    if (action === "wipe" || action === "unenroll") {
      const device = await sophos<{ name?: string }>(session, `/mobile/v1/devices/${id}`);
      const expected = device.name || "DELETE";
      if (!matches(text(formData, "confirm"), expected)) return { error: `Type “${expected}” to continue.` };
    }
    await sophos(session, `/mobile/v1/actions/${action}`, {
      method: "POST",
      body: { endpoints: [id], arguments: argumentsBody },
    });
  } catch (error) {
    return settle(error);
  }
  revalidatePath(`/phones/${id}`);
  return { message: "Sophos accepted the request." };
}

function mobileArguments(action: MobileAction, formData: FormData): Record<string, string> | { error: string } {
  if (action === "lock") {
    const message = optionalText(text(formData, "message"), 500);
    const phone = text(formData, "phone").replace(/[^\d+]/g, "").slice(0, 50);
    return {
      ...(message ? { lockScreenMessage: message } : {}),
      ...(phone ? { phoneNumber: phone } : {}),
    };
  }
  if (action === "send-message") {
    const message = optionalText(text(formData, "message"), 500);
    if (!message) return { error: "Write the message to send." };
    return { message };
  }
  return {};
}

export async function deletePhone(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "That phone could not be matched." };
  try {
    const device = await sophos<{ name?: string }>(session, `/mobile/v1/devices/${id}`);
    const expected = device.name || "DELETE";
    if (!matches(text(formData, "confirm"), expected)) return { error: `Type “${expected}” to delete this phone.` };
    await sophos(session, `/mobile/v1/devices/${id}`, { method: "DELETE" });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/phones");
  redirect("/phones");
}

export async function saveMailbox(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const creating = !id;
  if (!creating && !isUuid(id)) return { error: "That mailbox could not be matched." };
  const name = shortName(text(formData, "name"), 1, 255);
  if (!name) return { error: "Enter a mailbox name, up to 255 characters." };
  try {
    if (creating) {
      const email = emailOf(text(formData, "email"));
      if (!email) return { error: "Enter the mailbox email address." };
      const created = await sophos<{ id?: string }>(session, "/email/v1/mailboxes", {
        method: "POST",
        body: { name, email, type: "user" },
      });
      revalidatePath("/email");
      if (created.id && isUuid(created.id)) redirect(`/email/mailboxes/${created.id}`);
      redirect("/email");
    }
    await sophos(session, `/email/v1/mailboxes/${id}`, { method: "PATCH", body: { name } });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/email");
  revalidatePath(`/email/mailboxes/${id}`);
  return { message: "Mailbox updated." };
}

export async function deleteMailbox(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "That mailbox could not be matched." };
  try {
    const mailbox = await sophos<{ name?: string; email?: string; emailAddress?: string }>(session, `/email/v1/mailboxes/${id}`);
    const expected = mailbox.email || mailbox.emailAddress || mailbox.name || "DELETE";
    if (!matches(text(formData, "confirm"), expected)) return { error: `Type “${expected}” to delete this mailbox.` };
    await sophos(session, `/email/v1/mailboxes/${id}`, { method: "DELETE" });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/email");
  redirect("/email");
}

export async function quarantineAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const action = oneOf(text(formData, "action"), ["release", "delete"] as const);
  if (!isUuid(id) || !action) return { error: "That message could not be matched." };
  if (action === "delete" && text(formData, "confirm") !== "DELETE") {
    return { error: "Type DELETE to remove this message from quarantine." };
  }
  try {
    await sophos(session, `/email/v1/quarantine/messages/${action}`, {
      method: "POST",
      body: { items: [id] },
    });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/email/quarantine");
  return { message: action === "release" ? "Release requested." : "Delete requested." };
}

export async function saveFirewall(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const name = shortName(text(formData, "name"), 3, 40);
  if (!isUuid(id) || !name) return { error: "Firewall names must be 3 to 40 characters." };
  try {
    await sophos(session, `/firewall/v1/firewalls/${id}`, { method: "PATCH", body: { name } });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/firewalls");
  revalidatePath(`/firewalls/${id}`);
  return { message: "Firewall renamed." };
}

export async function deleteFirewall(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "That firewall could not be matched." };
  try {
    const current = await sophos<{ name?: string; hostname?: string }>(session, `/firewall/v1/firewalls/${id}`);
    const expected = current.name || current.hostname || "DELETE";
    if (!matches(text(formData, "confirm"), expected)) return { error: `Type “${expected}” to delete this firewall.` };
    await sophos(session, `/firewall/v1/firewalls/${id}`, { method: "DELETE" });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/firewalls");
  redirect("/firewalls");
}

export async function saveFirewallGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const name = shortName(text(formData, "name"), 1, 80);
  if (!name) return { error: "Enter a group name, up to 80 characters." };
  try {
    await sophos(session, "/firewall/v1/firewall-groups", { method: "POST", body: { name } });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/firewalls");
  return { message: "Firewall group created." };
}

export async function deleteFirewallGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "That group could not be matched." };
  if (text(formData, "confirm") !== "DELETE") return { error: "Type DELETE to remove this firewall group." };
  try {
    await sophos(session, `/firewall/v1/firewall-groups/${id}`, { method: "DELETE" });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/firewalls");
  return { message: "Firewall group deleted." };
}
