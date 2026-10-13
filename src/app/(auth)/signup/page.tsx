import Link from "next/link";
import { SignUpForm } from "./signup-form";

export const metadata = { title: "Create account" };

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-muted">You will confirm your email before you can create or join a workspace.</p>
      </div>
      <SignUpForm />
      <p className="text-sm text-muted">
        Already registered? <Link className="text-accent underline-offset-4 hover:underline" href="/login">Sign in</Link>
      </p>
    </div>
  );
}
