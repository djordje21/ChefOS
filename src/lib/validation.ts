import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254));
const uuid = z.uuid();

export const MIN_PASSWORD_LENGTH = 12;
export const password = z
  .string()
  .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters`)
  .max(128)
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use both letters and numbers");

export const signUpSchema = z.object({
  fullName: z.string().trim().min(1, "Enter your name").max(200),
  email,
  password,
});

export const signInSchema = z.object({ email, password: z.string().min(1, "Enter your password").max(128) });
export const emailOnlySchema = z.object({ email });
export const newPasswordSchema = z
  .object({ password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "Passwords do not match", path: ["confirm"] });

export const workspaceSchema = z.object({
  name: z.string().trim().min(1, "Enter a name").max(120),
  baseCurrency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Use a 3-letter ISO currency code, e.g. EUR"),
  locale: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/, "Invalid locale"),
  timezone: z.string().min(1).max(64),
});

export const workspaceSettingsSchema = workspaceSchema.omit({ baseCurrency: true }).extend({ workspaceId: uuid });

export const OUTLET_TYPES = [
  "restaurant", "bar", "breakfast", "banqueting", "room_service", "cafe", "production_kitchen", "other",
] as const;

export const outletSchema = z.object({
  workspaceId: uuid,
  name: z.string().trim().min(1, "Enter a name").max(120),
  type: z.enum(OUTLET_TYPES),
});

export const outletUpdateSchema = outletSchema.extend({ outletId: uuid, active: z.boolean() });

const outletGrants = z.array(z.object({ outlet_id: uuid, role_id: uuid }));

export const invitationSchema = z.object({
  workspaceId: uuid,
  email,
  roleId: uuid,
  allOutlets: z.boolean(),
  outletGrants,
  validDays: z.coerce.number().int().min(1).max(30),
});

export const memberUpdateSchema = z.object({
  workspaceId: uuid, userId: uuid, roleId: uuid, allOutlets: z.boolean(),
});

export const outletAccessSchema = z.object({
  workspaceId: uuid, userId: uuid, outletId: uuid, roleId: uuid.nullable(),
});

/** Reads `grant:<outletId>` = roleId fields from a form; empty means no access. */
export function readOutletGrants(form: FormData) {
  const grants: { outlet_id: string; role_id: string }[] = [];
  for (const [key, value] of form.entries()) {
    if (key.startsWith("grant:") && typeof value === "string" && value) {
      grants.push({ outlet_id: key.slice("grant:".length), role_id: value });
    }
  }
  return grants;
}

/** Only same-origin relative paths are allowed as post-login redirects. */
export function safeNextPath(next: unknown, fallback = "/app"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }
  return next;
}

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid input";
}
