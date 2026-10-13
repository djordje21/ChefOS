import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { relativeRedirect, sameHostUrl } from "@/lib/redirect";

describe("redirect helpers keep the browser on its own host", () => {
  it("relativeRedirect emits a relative, same-origin Location only", () => {
    expect(relativeRedirect("/app").headers.get("location")).toBe("/app");
    expect(relativeRedirect("https://evil.example/x").headers.get("location")).toBe("/");
    expect(relativeRedirect("//evil.example").headers.get("location")).toBe("/");
    expect(relativeRedirect("/login", 303).status).toBe(303);
  });

  it("sameHostUrl uses the Host the browser sent, and ignores malformed hosts", () => {
    const req = (host: string) =>
      new NextRequest("http://localhost:3000/app", { headers: { host } });
    expect(sameHostUrl(req("127.0.0.1:3000"), "/login").toString()).toBe("http://127.0.0.1:3000/login");
    expect(sameHostUrl(req("evil.example/x"), "/login").toString()).toBe("http://localhost:3000/login");
    expect(sameHostUrl(req("127.0.0.1:3000"), "https://evil.example").toString()).toBe("http://127.0.0.1:3000/");
  });
});
