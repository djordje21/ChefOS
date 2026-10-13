import Link from "next/link";
import { redirect } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Alert, Card } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { acceptInvitation } from "../../app/actions";

export const metadata = { title: "Invitation" };

type Preview = { workspace_name: string; role_name: string; email: string; invited_by_name: string; expires_at: string; state: string };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const { data } = await supabase.rpc("get_invitation", { p_token: token });
  const invite = ((data ?? []) as Preview[])[0];

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <Link href="/app" className="text-lg font-semibold tracking-tight">ChefOS</Link>
      <Card className="mt-8">
        {!invite ? (
          <Alert tone="error">This invitation link is not valid.</Alert>
        ) : invite.state !== "open" ? (
          <Alert tone="error">This invitation has {invite.state === "accepted" ? "already been used" : invite.state === "revoked" ? "been revoked" : "expired"}. Ask for a new one.</Alert>
        ) : (
          <div className="space-y-4">
            <h1 className="text-lg font-semibold">Join {invite.workspace_name}</h1>
            <p className="text-sm text-muted">{invite.invited_by_name} invited <strong>{invite.email}</strong> as <strong>{invite.role_name}</strong>.</p>
            {user.email?.toLowerCase() !== invite.email && (
              <Alert tone="error">You are signed in as {user.email}. Sign in with {invite.email} to accept.</Alert>
            )}
            <ActionForm action={acceptInvitation}>
              <input type="hidden" name="token" value={token} />
              <SubmitButton className="w-full">Accept invitation</SubmitButton>
            </ActionForm>
          </div>
        )}
      </Card>
    </main>
  );
}
