import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Card, Field, Input } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";
import { updatePassword } from "../../(auth)/actions";

export const metadata = { title: "Change password" };

export default async function PasswordPage() {
  const { user } = await requireUser();
  return (
    <main className="mx-auto max-w-md px-4 py-10">
      <Link href="/app" className="text-sm text-muted hover:underline">← Workspaces</Link>
      <h1 className="mt-4 mb-1 text-xl font-semibold">Change password</h1>
      <p className="mb-6 text-sm text-muted">{user.email}</p>
      <Card>
        <ActionForm action={updatePassword}>
          <Field label="New password" hint={`At least ${MIN_PASSWORD_LENGTH} characters, letters and numbers.`}>
            <Input name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} />
          </Field>
          <Field label="Repeat new password"><Input name="confirm" type="password" autoComplete="new-password" required /></Field>
          <SubmitButton>Update password</SubmitButton>
        </ActionForm>
      </Card>
    </main>
  );
}
