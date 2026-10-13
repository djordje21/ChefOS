import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export type Permissions = { workspace: string[]; all_outlets: boolean; outlets: Record<string, string[]> };

/**
 * Loads a workspace the caller belongs to, or 404s. Permissions returned here
 * are for showing/hiding UI only; the database enforces them independently.
 */
export async function requireWorkspace(workspaceId: string) {
  const { supabase, user } = await requireUser();
  if (!/^[0-9a-f-]{36}$/i.test(workspaceId)) notFound();
  const [{ data: workspace }, { data: perms }] = await Promise.all([
    supabase.from("workspaces").select("id, name, kind, base_currency, locale, timezone").eq("id", workspaceId).maybeSingle(),
    supabase.rpc("my_permissions", { p_workspace_id: workspaceId }),
  ]);
  if (!workspace || !perms) notFound();
  const permissions = perms as Permissions;
  const can = (perm: string) => permissions.workspace.includes(perm);
  return { supabase, user, workspace, permissions, can };
}
