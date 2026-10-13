"use client";

import { useActionState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/errors";
import { Alert, Button } from "./ui";

type Action = (state: FormState, form: FormData) => Promise<FormState>;

/** A form bound to a server action, showing its error/success message. */
export function ActionForm({
  action, children, className, showOk = true,
}: { action: Action; children: ReactNode | ((state: FormState) => ReactNode); className?: string; showOk?: boolean }) {
  const [state, formAction] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className ?? "space-y-4"}>
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      {showOk && state?.ok && <Alert tone="success">{state.ok}</Alert>}
      {typeof children === "function" ? children(state) : children}
    </form>
  );
}

export function SubmitButton({ children, variant, className }: { children: ReactNode; variant?: "primary" | "secondary" | "danger"; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} variant={variant} className={className} aria-busy={pending}>
      {pending ? "Working…" : children}
    </Button>
  );
}
