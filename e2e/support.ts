import { expect, type Page } from "@playwright/test";

const MAIL_URL = (process.env.E2E_MAIL_URL ?? "http://127.0.0.1:54324").replace(/\/$/, "");
export const PASSWORD = "Kitchen-e2e-2026";

export function uniqueEmail(tag: string) {
  return `e2e-${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

type MailMessage = { id: string; text: string };

/** Reads the newest message for `to` from the local mail catcher (Mailpit, or legacy Inbucket). */
async function latestMessage(to: string): Promise<MailMessage | null> {
  const mailpit = await fetch(`${MAIL_URL}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`).catch(() => null);
  if (mailpit?.ok) {
    const list = (await mailpit.json()) as { messages?: { ID: string }[] };
    const id = list.messages?.[0]?.ID;
    if (!id) return null;
    const msg = (await (await fetch(`${MAIL_URL}/api/v1/message/${id}`)).json()) as { Text?: string; HTML?: string };
    return { id, text: `${msg.Text ?? ""}\n${msg.HTML ?? ""}` };
  }
  const mailbox = to.split("@")[0];
  const inbucket = await fetch(`${MAIL_URL}/api/v1/mailbox/${mailbox}`).catch(() => null);
  if (!inbucket?.ok) return null;
  const list = (await inbucket.json()) as { id: string }[];
  const last = list.at(-1);
  if (!last) return null;
  const msg = (await (await fetch(`${MAIL_URL}/api/v1/mailbox/${mailbox}/${last.id}`)).json()) as {
    body?: { text?: string; html?: string };
  };
  return { id: last.id, text: `${msg.body?.text ?? ""}\n${msg.body?.html ?? ""}` };
}

/** Waits for an email to `to` and returns the first auth link in it. */
export async function emailLink(to: string, timeoutMs = 30_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const msg = await latestMessage(to);
    const link = msg?.text.match(/https?:\/\/[^\s"'<>)]+(?:verify|confirm)[^\s"'<>)]*/)?.[0];
    if (link) return link.replace(/&amp;/g, "&");
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`No confirmation email for ${to} within ${timeoutMs} ms`);
}

/** Signs up through the UI and confirms the address through the emailed link. Ends signed in on /app. */
export async function signUpAndConfirm(page: Page, email: string, fullName: string) {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
  await page.goto(await emailLink(email));
  await expect(page).toHaveURL(/\/app$/);
}

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
}

export async function createWorkspace(page: Page, name: string) {
  await page.goto("/app");
  await page.getByLabel("Business name").fill(name);
  await page.getByLabel("Base currency").fill("EUR");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/app\/w\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();
  return page.url().split("/app/w/")[1]!;
}

export async function createOutlet(page: Page, workspaceId: string, name: string) {
  await page.goto(`/app/w/${workspaceId}/outlets`);
  const form = page.locator("form", { has: page.getByRole("button", { name: "Create outlet" }) });
  await form.getByLabel("Name").fill(name);
  await form.getByRole("button", { name: "Create outlet" }).click();
  await expect(page.getByText(`Outlet “${name}” created.`)).toBeVisible();
}
