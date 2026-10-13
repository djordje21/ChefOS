"use server";

import { redirect } from "next/navigation";
import { publicEnv } from "@/lib/env";
import type { FormState } from "@/lib/errors";
import { createClient } from "@/lib/supabase/server";
import { emailOnlySchema, firstError, newPasswordSchema, safeNextPath, signInSchema, signUpSchema } from "@/lib/validation";

export async function signUp(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    fullName: form.get("fullName"), email: form.get("email"), password: form.get("password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv().siteUrl}/auth/confirm?next=/app`,
    },
  });
  // Same response whether or not the address already exists (no account enumeration).
  if (error && error.status !== 422 && error.code !== "user_already_exists") {
    if (error.code === "weak_password") return { error: error.message };
    return { error: "Sign-up failed. Please try again later." };
  }
  return { ok: "Check your inbox and confirm your email address to continue." };
}

export async function signIn(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "Confirm your email address first — check your inbox." };
    return { error: "Incorrect email or password." };
  }
  redirect(safeNextPath(form.get("next")));
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse({ email: form.get("email") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv().siteUrl}/auth/confirm?next=/account/password`,
  });
  return { ok: "If an account exists for that address, a reset link is on its way." };
}

export async function updatePassword(_: FormState, form: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse({ password: form.get("password"), confirm: form.get("confirm") });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.code === "same_password" ? "Choose a different password." : "Could not update the password." };
  return { ok: "Password updated." };
}
