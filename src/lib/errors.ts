type PgLikeError = { code?: string; message?: string } | null | undefined;

// SQLSTATEs raised deliberately by ChefOS database functions with user-facing messages.
const USER_FACING = new Set(["42501", "P0001", "P0002", "22023"]);

/** Turns a Supabase/PostgREST error into a message that is safe to show. */
export function userMessage(error: PgLikeError, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  if (error.code === "23505") return "That name is already in use.";
  if (error.code === "23514") return "Some of the values are not valid.";
  if (error.code && USER_FACING.has(error.code) && error.message && !/permission denied for/i.test(error.message)) {
    return error.message;
  }
  if (error.code === "42501") return "You do not have permission to do that.";
  return fallback;
}

export type FormState = { error?: string; ok?: string; token?: string } | undefined;
