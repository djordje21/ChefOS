import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { requestPasswordReset } from "../actions";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <h1 className="display text-2xl">Reset your password</h1>
      <ActionForm action={requestPasswordReset}>
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <SubmitButton className="w-full">Send reset link</SubmitButton>
      </ActionForm>
      <Link className="text-sm text-muted underline-offset-4 hover:underline" href="/login">Back to sign in</Link>
    </div>
  );
}
