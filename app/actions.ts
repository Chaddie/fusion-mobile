"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { clearSession, deploymentCredentials, requireSession, writeSession } from "@/lib/session";
import { connectTenant, invalidateToken, SophosError, sophos } from "@/lib/sophos";
import type { ActionState, Endpoint, UserGroup } from "@/lib/types";
import {
  alertActionOf,
  emailOf,
  endpointGroupText,
  endpointTypeOf,
  givenName,
  isUuid,
  optionalText,
  personName,
  text,
  unquote,
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

export async function connectAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const clientId = unquote(text(formData, "clientId"));
  const clientSecret = unquote(text(formData, "clientSecret"));
  if (!isUuid(clientId)) return { error: "Paste the client ID from Sophos. It looks like 57ca9a6b-885f-4e36-95ec-290548c26059." };
  if (clientSecret.length < 8 || clientSecret.length > 300 || /\s/.test(clientSecret)) {
    return { error: "Paste the client secret again, without spaces or extra text." };
  }
  try {
    const session = await connectTenant(clientId, clientSecret);
    await writeSession(session);
  } catch (error) {
    return settle(error);
  }
  redirect("/home");
}

export async function connectWithDeploymentAction(): Promise<void> {
  const saved = deploymentCredentials();
  if (!saved || !isUuid(saved.clientId)) {
    redirect("/?error=missing-deployment-credentials");
  }
  try {
    const session = await connectTenant(saved.clientId, saved.clientSecret);
    await writeSession(session);
  } catch (error) {
    const message = error instanceof SophosError ? error.message : "Could not connect with the saved credentials.";
    redirect(`/?error=${encodeURIComponent(message)}`);
  }
  redirect("/home");
}

export async function disconnectAction(): Promise<void> {
  const session = await requireSession();
  invalidateToken(session.clientId);
  await clearSession();
  redirect("/");
}

export async function actOnAlert(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const alertId = text(formData, "alertId");
  const action = alertActionOf(text(formData, "action"));
  const message = optionalText(text(formData, "message"), 500);
  if (!isUuid(alertId) || !action) return { error: "That alert action is not available." };
  if ((action === "sendMsgPua" || action === "sendMsgThreat") && !message) {
    return { error: "Write the message Sophos should send." };
  }
  try {
    await sophos(session, `/common/v1/alerts/${alertId}/actions`, {
      method: "POST",
      body: { action, message: message ?? undefined },
    });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/alerts");
  revalidatePath(`/alerts/${alertId}`);
  revalidatePath("/home");
  return { message: "Sophos accepted the action." };
}

export async function scanEndpoint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  if (!isUuid(id)) return { error: "That device could not be matched." };
  try {
    await sophos(session, `/endpoint/v1/endpoints/${id}/scans`, { method: "POST", body: {} });
  } catch (error) {
    return settle(error);
  }
  revalidatePath(`/devices/${id}`);
  return { message: "Scan requested. It starts when the device next checks in." };
}

export async function setIsolation(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const enabled = text(formData, "enabled") === "true";
  const comment = text(formData, "comment").slice(0, 400);
  if (!isUuid(id)) return { error: "That device could not be matched." };
  if (enabled && comment.trim().length < 3) return { error: "Add a short reason for isolating this device." };
  try {
    await sophos(session, "/endpoint/v1/endpoints/isolation", {
      method: "POST",
      body: { enabled, ids: [id], comment: comment.trim() || undefined },
    });
  } catch (error) {
    return settle(error);
  }
  revalidatePath(`/devices/${id}`);
  revalidatePath("/devices");
  revalidatePath("/home");
  return { message: enabled ? "Isolation requested." : "Release from isolation requested." };
}

export async function setTamper(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const mode = text(formData, "mode");
  if (!isUuid(id)) return { error: "That device could not be matched." };
  const body =
    mode === "regenerate"
      ? { regeneratePassword: true }
      : mode === "on"
        ? { enabled: true }
        : mode === "off"
          ? { enabled: false }
          : null;
  if (!body) return { error: "Choose a tamper protection change." };
  try {
    const result = await sophos<{ enabled?: boolean; password?: string }>(
      session,
      `/endpoint/v1/endpoints/${id}/tamper-protection`,
      { method: "POST", body },
    );
    revalidatePath(`/devices/${id}`);
    if (mode === "regenerate") {
      return {
        message: "New tamper protection password created. Copy it now.",
        password: result.password,
      };
    }
    return { message: result.enabled ? "Tamper protection is on." : "Tamper protection is off." };
  } catch (error) {
    return settle(error);
  }
}

export async function deleteEndpoint(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const confirm = text(formData, "confirm");
  if (!isUuid(id)) return { error: "That device could not be matched." };
  try {
    const endpoint = await sophos<Endpoint>(session, `/endpoint/v1/endpoints/${id}`, { query: { view: "summary" } });
    const expected = endpoint.hostname || "DELETE";
    if (confirm !== expected) return { error: `Type ${expected} exactly. Nothing was deleted.` };
    await sophos(session, `/endpoint/v1/endpoints/${id}`, { method: "DELETE" });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/devices");
  revalidatePath("/home");
  redirect("/devices?removed=1");
}

export async function savePerson(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const creating = !id;
  if (!creating && !isUuid(id)) return { error: "That person could not be matched." };
  const name = personName(text(formData, "name"));
  if (!name) return { error: "Enter the person's full name, up to 250 characters." };
  const firstNameRaw = text(formData, "firstName");
  const lastNameRaw = text(formData, "lastName");
  if (firstNameRaw && !givenName(firstNameRaw)) return { error: "First name cannot contain spaces." };
  const lastName = lastNameRaw ? optionalText(lastNameRaw, 250) : null;
  if (lastNameRaw && !lastName) return { error: "Last name is too long." };
  const emailRaw = text(formData, "email");
  if (emailRaw && !emailOf(emailRaw)) return { error: "Enter a valid email address, or leave it blank." };
  const exchangeRaw = text(formData, "exchangeLogin");
  const exchange = exchangeRaw ? optionalText(exchangeRaw, 350) : null;
  if (exchangeRaw && !exchange) return { error: "Exchange login must be 350 characters or fewer." };

  const body = {
    name,
    firstName: givenName(firstNameRaw) ?? undefined,
    lastName: lastName ?? undefined,
    email: emailOf(emailRaw) ?? undefined,
    exchangeLogin: exchange ?? undefined,
  };

  try {
    if (creating) {
      const created = await sophos<{ id: string }>(session, "/common/v1/directory/users", { method: "POST", body });
      revalidatePath("/people");
      revalidatePath("/home");
      redirect(`/people/${created.id}`);
    }
    await sophos(session, `/common/v1/directory/users/${id}`, { method: "PATCH", body });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/people");
  revalidatePath(`/people/${id}`);
  return { message: "Person updated." };
}

export async function deletePerson(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const confirm = text(formData, "confirm");
  if (!isUuid(id)) return { error: "That person could not be matched." };
  try {
    const user = await sophos<{ name?: string }>(session, `/common/v1/directory/users/${id}`);
    const expected = user.name || "DELETE";
    if (confirm !== expected) return { error: `Type ${expected} exactly. Nothing was deleted.` };
    await sophos(session, `/common/v1/directory/users/${id}`, { method: "DELETE" });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/people");
  revalidatePath("/home");
  redirect("/people?removed=1");
}

export async function saveUserGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const creating = !id;
  if (!creating && !isUuid(id)) return { error: "That group could not be matched." };
  const name = personName(text(formData, "name"));
  const description = optionalText(text(formData, "description"), 1000);
  if (!name) return { error: "Enter a group name, up to 250 characters." };
  if (text(formData, "description") && !description && text(formData, "description").trim()) {
    return { error: "Description must be 1000 characters or fewer." };
  }
  const body = { name, description: description ?? undefined };
  try {
    if (creating) {
      const created = await sophos<UserGroup>(session, "/common/v1/directory/user-groups", { method: "POST", body });
      revalidatePath("/groups");
      redirect(`/groups/${created.id}`);
    }
    await sophos(session, `/common/v1/directory/user-groups/${id}`, { method: "PATCH", body });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/groups");
  revalidatePath(`/groups/${id}`);
  return { message: "Group updated." };
}

export async function deleteUserGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const confirm = text(formData, "confirm");
  if (!isUuid(id)) return { error: "That group could not be matched." };
  try {
    const group = await sophos<UserGroup>(session, `/common/v1/directory/user-groups/${id}`);
    const expected = group.name || "DELETE";
    if (confirm !== expected) return { error: `Type ${expected} exactly. Nothing was deleted.` };
    await sophos(session, `/common/v1/directory/user-groups/${id}`, { method: "DELETE" });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/groups");
  redirect("/groups?removed=1");
}

export async function addUserToGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const groupId = text(formData, "groupId");
  const userId = text(formData, "userId");
  if (!isUuid(groupId) || !isUuid(userId)) return { error: "That person could not be matched." };
  try {
    const result = await sophos<{ addedUsers?: { id: string }[] }>(
      session,
      `/common/v1/directory/user-groups/${groupId}/users`,
      { method: "POST", body: { ids: [userId] } },
    );
    if (!result.addedUsers?.length) {
      return { error: "Sophos could not add that person. Synced directories have to be changed at their source." };
    }
  } catch (error) {
    return settle(error);
  }
  revalidatePath(`/groups/${groupId}`);
  return { message: "Added to the group." };
}

export async function removeUserFromGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const groupId = text(formData, "groupId");
  const userId = text(formData, "userId");
  if (!isUuid(groupId) || !isUuid(userId)) return { error: "That person could not be matched." };
  try {
    await sophos(session, `/common/v1/directory/user-groups/${groupId}/users`, {
      method: "DELETE",
      query: { ids: userId },
    });
  } catch (error) {
    return settle(error);
  }
  revalidatePath(`/groups/${groupId}`);
  return { message: "Removed from the group." };
}

export async function saveDeviceGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const creating = !id;
  if (!creating && !isUuid(id)) return { error: "That group could not be matched." };
  const name = endpointGroupText(text(formData, "name"), 250);
  const descriptionRaw = text(formData, "description");
  const description = descriptionRaw ? endpointGroupText(descriptionRaw, 1000) : null;
  if (!name) return { error: "Enter a group name without # , + \" \\ < > or ;" };
  if (descriptionRaw && !description) return { error: "Description uses the same character limits as the name, up to 1000 characters." };
  const type = endpointTypeOf(text(formData, "type"));
  if (creating && !type) return { error: "Choose computers or servers." };
  try {
    if (creating) {
      const created = await sophos<{ id: string }>(session, "/endpoint/v1/endpoint-groups", {
        method: "POST",
        body: { name, description: description ?? undefined, type },
      });
      revalidatePath("/device-groups");
      redirect(`/device-groups/${created.id}`);
    }
    await sophos(session, `/endpoint/v1/endpoint-groups/${id}`, {
      method: "PATCH",
      body: { name, description: description ?? undefined },
    });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/device-groups");
  revalidatePath(`/device-groups/${id}`);
  return { message: "Device group updated." };
}

export async function deleteDeviceGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = text(formData, "id");
  const confirm = text(formData, "confirm");
  if (!isUuid(id)) return { error: "That group could not be matched." };
  try {
    const group = await sophos<{ name?: string }>(session, `/endpoint/v1/endpoint-groups/${id}`);
    const expected = group.name || "DELETE";
    if (confirm !== expected) return { error: `Type ${expected} exactly. Nothing was deleted.` };
    await sophos(session, `/endpoint/v1/endpoint-groups/${id}`, { method: "DELETE" });
  } catch (error) {
    return settle(error);
  }
  revalidatePath("/device-groups");
  redirect("/device-groups?removed=1");
}

export async function addEndpointToGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const groupId = text(formData, "groupId");
  const endpointId = text(formData, "endpointId");
  if (!isUuid(groupId) || !isUuid(endpointId)) return { error: "That device could not be matched." };
  try {
    const result = await sophos<{ addedEndpoints?: { id: string }[] }>(
      session,
      `/endpoint/v1/endpoint-groups/${groupId}/endpoints`,
      { method: "POST", body: { ids: [endpointId] } },
    );
    if (!result.addedEndpoints?.length) {
      return { error: "Sophos could not add that device. It may be the wrong type, or the group is synced." };
    }
  } catch (error) {
    return settle(error);
  }
  revalidatePath(`/device-groups/${groupId}`);
  return { message: "Device added." };
}

export async function removeEndpointFromGroup(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireSession();
  const groupId = text(formData, "groupId");
  const endpointId = text(formData, "endpointId");
  if (!isUuid(groupId) || !isUuid(endpointId)) return { error: "That device could not be matched." };
  try {
    await sophos(session, `/endpoint/v1/endpoint-groups/${groupId}/endpoints`, {
      method: "DELETE",
      query: { ids: endpointId },
    });
  } catch (error) {
    return settle(error);
  }
  revalidatePath(`/device-groups/${groupId}`);
  return { message: "Device removed from the group." };
}
