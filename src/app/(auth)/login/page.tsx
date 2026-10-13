import Link from "next/link";
import { ActionForm, SubmitButton } from "@/components/action-form";
import { Alert, Field, Input } from "@/components/ui";
import { safeNextPath } from "@/lib/validation";
import { signIn } from "../actions";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Sign in</h1>
      {params.error === "link" && <Alert tone="error">That link is invalid or has expired. Request a new one.</Alert>}
      {params.confirmed && <Alert tone="success">Email confirmed. You can sign in now.</Alert>}
      <ActionForm action={signIn}>
        <input type="hidden" name="next" value={next} />
        <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Password"><Input name="password" type="password" autoComplete="current-password" required /></Field>
        <SubmitButton className="w-full">Sign in</SubmitButton>
      </ActionForm>
      <div className="flex justify-between text-sm">
        <Link className="text-accent underline-offset-4 hover:underline" href={`/signup${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`}>Create an account</Link>
        <Link className="text-muted underline-offset-4 hover:underline" href="/forgot-password">Forgot password?</Link>
      </div>
    </div>
  );
}
