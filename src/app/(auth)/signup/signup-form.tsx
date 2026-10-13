"use client";

import { ActionForm, SubmitButton } from "@/components/action-form";
import { Field, Input } from "@/components/ui";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";
import { signUp } from "../actions";

export function SignUpForm() {
  return (
    <ActionForm action={signUp}>
      {(state) =>
        state?.ok ? null : (
          <>
            <Field label="Full name"><Input name="fullName" autoComplete="name" required maxLength={200} /></Field>
            <Field label="Email"><Input name="email" type="email" autoComplete="email" required /></Field>
            <Field label="Password" hint={`At least ${MIN_PASSWORD_LENGTH} characters, letters and numbers.`}>
              <Input name="password" type="password" autoComplete="new-password" required minLength={MIN_PASSWORD_LENGTH} />
            </Field>
            <SubmitButton className="w-full">Create account</SubmitButton>
          </>
        )
      }
    </ActionForm>
  );
}
