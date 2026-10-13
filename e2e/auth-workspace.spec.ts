import { expect, test } from "@playwright/test";
import { createOutlet, createWorkspace, emailLink, PASSWORD, signIn, signUpAndConfirm, uniqueEmail } from "./support";

test("private routes redirect to sign-in", async ({ page }) => {
  for (const path of ["/app", "/account/password", `/app/w/${crypto.randomUUID()}`]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login\?next=/);
  }
});

test("sign up → confirm email → create workspace → sign out → sign back in", async ({ page }) => {
  const email = uniqueEmail("owner");

  // Unconfirmed accounts cannot sign in.
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("E2E Owner");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();
  await signIn(page, email);
  await expect(page.getByRole("alert").filter({ hasText: "Confirm your email" })).toBeVisible();

  // Confirming signs the user in; a new account has no workspace and no privileges.
  await page.goto(await emailLink(email));
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("No workspaces yet")).toBeVisible();

  const workspaceId = await createWorkspace(page, "E2E Bistro");
  await expect(page.getByText("Owner", { exact: true })).toBeVisible();
  await createOutlet(page, workspaceId, "Terrace");

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto(`/app/w/${workspaceId}`);
  await expect(page).toHaveURL(/\/login\?next=/);

  // Data persists across sessions, and `next` brings the user back.
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(new RegExp(`/app/w/${workspaceId}$`));
  await page.goto(`/app/w/${workspaceId}/outlets`);
  await expect(page.locator('input[name="name"][value="Terrace"]')).toBeVisible();
});

test("invitation: an outlet-restricted member sees only their outlet, and no other workspace", async ({ browser }) => {
  const owner = await browser.newContext();
  const ownerPage = await owner.newPage();
  await signUpAndConfirm(ownerPage, uniqueEmail("inviter"), "E2E Inviter");
  const workspaceId = await createWorkspace(ownerPage, "E2E Hotel");
  await createOutlet(ownerPage, workspaceId, "Main Restaurant");
  await createOutlet(ownerPage, workspaceId, "Lounge Bar");

  const memberEmail = uniqueEmail("member");
  await ownerPage.goto(`/app/w/${workspaceId}/members`);
  const inviteForm = ownerPage.locator("form", { has: ownerPage.getByRole("button", { name: "Create invitation" }) });
  await inviteForm.getByLabel("Email").fill(memberEmail);
  await inviteForm.getByLabel("Workspace role").selectOption({ label: "Viewer" });
  await inviteForm.getByLabel("Access to all outlets").uncheck();
  await inviteForm.locator("label", { hasText: "Lounge Bar" }).locator("select").selectOption({ label: "Outlet Chef" });
  await inviteForm.getByRole("button", { name: "Create invitation" }).click();
  const inviteLink = await ownerPage.locator("input[readonly]").inputValue();
  expect(inviteLink).toMatch(/\/invite\/[0-9a-f]{64}$/);

  const member = await browser.newContext();
  const memberPage = await member.newPage();
  await signUpAndConfirm(memberPage, memberEmail, "E2E Member");
  await memberPage.goto(inviteLink);
  await expect(memberPage.getByRole("heading", { name: "Join E2E Hotel" })).toBeVisible();
  await memberPage.getByRole("button", { name: "Accept invitation" }).click();
  await expect(memberPage).toHaveURL(new RegExp(`/app/w/${workspaceId}$`));

  await memberPage.goto(`/app/w/${workspaceId}/outlets`);
  const names = memberPage.locator('input[name="name"]');
  await expect(names).toHaveCount(1);
  await expect(names.first()).toHaveValue("Lounge Bar");

  // The link is single-use, and other workspaces are not reachable by URL.
  await memberPage.goto(inviteLink);
  await expect(memberPage.getByRole("alert").filter({ hasText: "already been used" })).toBeVisible();
  await memberPage.goto(`/app/w/${crypto.randomUUID()}`);
  await expect(memberPage.getByRole("heading", { name: "Not found" })).toBeVisible();

  await owner.close();
  await member.close();
});
