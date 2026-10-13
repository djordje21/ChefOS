import { describe, expect, it } from "vitest";
import { userMessage } from "@/lib/errors";

describe("userMessage", () => {
  it("passes through deliberate ChefOS database messages", () => {
    expect(userMessage({ code: "P0001", message: "A workspace must keep at least one owner" })).toBe(
      "A workspace must keep at least one owner",
    );
    expect(userMessage({ code: "42501", message: "You cannot grant a role with permissions you do not have" })).toBe(
      "You cannot grant a role with permissions you do not have",
    );
  });

  it("hides raw PostgreSQL internals", () => {
    expect(userMessage({ code: "42501", message: "permission denied for table workspaces" })).toBe(
      "You do not have permission to do that.",
    );
    expect(userMessage({ code: "XX000", message: "internal error at foo.c:12" })).toBe("Something went wrong. Please try again.");
    expect(userMessage({ code: "23505", message: 'duplicate key value violates unique constraint "outlets_name_unique"' })).toBe(
      "That name is already in use.",
    );
  });
});
