"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { userMessage, type FormState } from "@/lib/errors";
import {
  firstError, invitationSchema, memberUpdateSchema, outletAccessSchema, outletSchema, outletUpdateSchema,
  readOutletGrants, workspaceSchema, workspaceSettingsSchema,
} from "@/lib/validation";

// Every action re-validates input and relies on the database (RLS + checked RPCs)
// for authorization. Hidden form fields are never trusted for permission decisions.

export async function createWorkspace(_: FormState, form: FormData): Promise<FormState> {
  const parsed = workspaceSchema.safeParse({
    name: form.get("name"), baseCurrency: form.get("baseCurrency"), locale: form.get("locale"), timezone: form.get("timezone"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_workspace", {
    p_name: parsed.data.name, p_base_currency: parsed.data.baseCurrency,
    p_locale: parsed.data.locale, p_timezone: parsed.data.timezone,
  });
  if (error) return { error: userMessage(error) };
  redirect(`/app/w/${data}`);
}

export async function updateWorkspaceSettings(_: FormState, form: FormData): Promise<FormState> {
  const parsed = workspaceSettingsSchema.safeParse({
    workspaceId: form.get("workspaceId"), name: form.get("name"), locale: form.get("locale"), timezone: form.get("timezone"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("workspaces")
    .update({ name: parsed.data.name, locale: parsed.data.locale, timezone: parsed.data.timezone })
    .eq("id", parsed.data.workspaceId)
    .select("id");
  if (error) return { error: userMessage(error) };
  if (!data?.length) return { error: "You do not have permission to change these settings." };
  revalidatePath(`/app/w/${parsed.data.workspaceId}`, "layout");
  return { ok: "Settings saved." };
}

export async function createOutlet(_: FormState, form: FormData): Promise<FormState> {
  const parsed = outletSchema.safeParse({ workspaceId: form.get("workspaceId"), name: form.get("name"), type: form.get("type") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("outlets")
    .insert({ workspace_id: parsed.data.workspaceId, name: parsed.data.name, type: parsed.data.type });
  if (error) return { error: userMessage(error) };
  revalidatePath(`/app/w/${parsed.data.workspaceId}`, "layout");
  return { ok: `Outlet “${parsed.data.name}” created.` };
}

export async function updateOutlet(_: FormState, form: FormData): Promise<FormState> {
  const parsed = outletUpdateSchema.safeParse({
    workspaceId: form.get("workspaceId"), outletId: form.get("outletId"), name: form.get("name"),
    type: form.get("type"), active: form.get("active") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { data, error } = await supabase
    .from("outlets")
    .update({ name: parsed.data.name, type: parsed.data.type, active: parsed.data.active })
    .eq("id", parsed.data.outletId)
    .eq("workspace_id", parsed.data.workspaceId)
    .select("id");
  if (error) return { error: userMessage(error) };
  if (!data?.length) return { error: "You do not have permission to change this outlet." };
  revalidatePath(`/app/w/${parsed.data.workspaceId}`, "layout");
  return { ok: "Saved." };
}

export async function createInvitation(_: FormState, form: FormData): Promise<FormState> {
  const allOutlets = form.get("allOutlets") === "on";
  const parsed = invitationSchema.safeParse({
    workspaceId: form.get("workspaceId"), email: form.get("email"), roleId: form.get("roleId"),
    allOutlets, outletGrants: allOutlets ? [] : readOutletGrants(form), validDays: form.get("validDays") ?? 7,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("create_invitation", {
    p_workspace_id: parsed.data.workspaceId, p_email: parsed.data.email, p_role_id: parsed.data.roleId,
    p_all_outlets: parsed.data.allOutlets, p_outlet_grants: parsed.data.outletGrants, p_valid_days: parsed.data.validDays,
  });
  if (error) return { error: userMessage(error) };
  const row = (data as { invitation_id: string; token: string }[])[0];
  revalidatePath(`/app/w/${parsed.data.workspaceId}/members`);
  // The token is returned once, to the inviter only, and is not stored in plain text anywhere.
  return { ok: `Invitation created for ${parsed.data.email}.`, token: row?.token };
}

export async function revokeInvitation(_: FormState, form: FormData): Promise<FormState> {
  const workspaceId = String(form.get("workspaceId") ?? "");
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("revoke_invitation", { p_invitation_id: String(form.get("invitationId") ?? "") });
  if (error) return { error: userMessage(error) };
  revalidatePath(`/app/w/${workspaceId}/members`);
  return { ok: "Invitation revoked." };
}

export async function updateMember(_: FormState, form: FormData): Promise<FormState> {
  const parsed = memberUpdateSchema.safeParse({
    workspaceId: form.get("workspaceId"), userId: form.get("userId"), roleId: form.get("roleId"),
    allOutlets: form.get("allOutlets") === "on",
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("update_member", {
    p_workspace_id: parsed.data.workspaceId, p_user_id: parsed.data.userId,
    p_role_id: parsed.data.roleId, p_all_outlets: parsed.data.allOutlets,
  });
  if (error) return { error: userMessage(error) };
  revalidatePath(`/app/w/${parsed.data.workspaceId}`, "layout");
  return { ok: "Member updated." };
}

export async function setOutletAccess(_: FormState, form: FormData): Promise<FormState> {
  const parsed = outletAccessSchema.safeParse({
    workspaceId: form.get("workspaceId"), userId: form.get("userId"), outletId: form.get("outletId"),
    roleId: form.get("roleId") || null,
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("set_outlet_access", {
    p_workspace_id: parsed.data.workspaceId, p_user_id: parsed.data.userId,
    p_outlet_id: parsed.data.outletId, p_role_id: parsed.data.roleId,
  });
  if (error) return { error: userMessage(error) };
  revalidatePath(`/app/w/${parsed.data.workspaceId}/members`);
  return { ok: "Outlet access updated." };
}

export async function removeMember(_: FormState, form: FormData): Promise<FormState> {
  const workspaceId = String(form.get("workspaceId") ?? "");
  const userId = String(form.get("userId") ?? "");
  const { supabase, user } = await requireUser();
  const { error } = await supabase.rpc("remove_member", { p_workspace_id: workspaceId, p_user_id: userId });
  if (error) return { error: userMessage(error) };
  if (userId === user.id) redirect("/app");
  revalidatePath(`/app/w/${workspaceId}`, "layout");
  return { ok: "Member removed." };
}

export async function acceptInvitation(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("accept_invitation", { p_token: String(form.get("token") ?? "") });
  if (error) return { error: userMessage(error) };
  redirect(`/app/w/${data}`);
}
