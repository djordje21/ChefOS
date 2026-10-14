import { expect, test } from "@playwright/test";

/**
 * The public landing and its five destinations. These pages are frontend-only
 * (fictional data, no Supabase calls), so they need no account.
 */

const destinations = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "ChefOS destinations" }).getByRole("link");

test("landing shows the headline and the five destinations at once", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Your kitchen\.\s*Your craft\.\s*Your command\./);
  await expect(destinations(page)).toHaveCount(5);
  await expect(destinations(page).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
});

test("reduced motion: the landing is immediately usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(destinations(page).first()).toBeVisible({ timeout: 2_000 });
});

test("destinations are reachable with the keyboard", async ({ page }) => {
  await page.goto("/");
  await destinations(page).filter({ hasText: "Food Cost" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/food-cost$/);
});

test("each destination opens and leads back to the kitchen", async ({ page }) => {
  const expected: [RegExp, string, RegExp][] = [
    [/Recipe Book/, "/recipes", /Harbour & Pine Group/],
    [/Food Cost/, "/food-cost", /Roast chicken supreme/],
    [/Journal/, "/journal", /Notes from the pass/],
    [/Industry News/, "/news", /The morning papers/],
    [/Pre-Opening/, "/pre-opening", /From blueprint to first service/],
  ];
  for (const [name, path, heading] of expected) {
    await page.goto("/");
    await destinations(page).filter({ hasText: name }).click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { name: heading }).first()).toBeVisible();
    await page.getByRole("link", { name: /Back to the kitchen/ }).click();
    await expect(page).toHaveURL(/\/$/);
  }
});

test("recipe book: open a recipe, cost it, add a draft recipe (in memory only)", async ({ page }) => {
  await page.goto("/recipes");
  await expect(page.getByText(/fictional restaurants/)).toBeVisible();
  await page.getByRole("button", { name: /Roast chicken supreme/ }).click();
  await expect(page.getByRole("heading", { name: /Roast chicken supreme/ })).toBeVisible();
  await expect(page.getByText("Chicken supreme, skin on")).toBeVisible();
  await page.getByRole("button", { name: "Open in Food Cost" }).click();
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("button", { name: "Food cost" })).toHaveAttribute("aria-current", "page");

  await page.getByRole("button", { name: "Recipe book" }).click();
  await page.getByRole("button", { name: "New recipe" }).click();
  await page.getByRole("button", { name: "Add to recipe book" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Give the recipe a name" })).toBeVisible();
  await page.getByLabel("Name").fill("Demo test tart");
  await page.getByLabel(/Menu price/).fill("12.50");
  await page.getByRole("button", { name: "Add to recipe book" }).click();
  await expect(page.getByRole("heading", { name: "Demo test tart" })).toBeVisible();
  await expect(page.getByText("No ingredients yet")).toBeVisible();

  // Nothing is persisted: a reload restores the fictional data set.
  await page.reload();
  await expect(page.getByText("Demo test tart")).toHaveCount(0);
});

test("journal lists six categories with clearly marked placeholder articles", async ({ page }) => {
  await page.goto("/journal");
  const tabs = page.getByRole("tablist", { name: "Categories" }).getByRole("tab");
  await expect(tabs).toHaveCount(7); // "All" + six categories
  await expect(page.getByText(/No articles are published yet/)).toBeVisible();
  await tabs.filter({ hasText: "Chef Career" }).click();
  await page.getByRole("link", { name: /From sous chef to executive chef/ }).click();
  await expect(page).toHaveURL(/\/journal\/[a-z0-9-]+$/);
  await expect(page.getByText(/What it will cover/)).toBeVisible();
});

test("industry news links only to publishers, in a new tab", async ({ page }) => {
  await page.goto("/news");
  const external = page.locator('main a[href^="https://"]');
  await expect(external).toHaveCount(3);
  for (const a of await external.all()) {
    await expect(a).toHaveAttribute("target", "_blank");
    await expect(a).toHaveAttribute("rel", /noopener/);
  }
});

test("pre-opening demo board is interactive; real projects stay behind sign-in", async ({ page }) => {
  await page.goto("/pre-opening");
  await expect(page.getByText(/4 of 16 tasks done/)).toBeVisible();
  await page.getByRole("checkbox", { name: /^Place order for combi ovens/ }).check();
  await expect(page.getByText(/5 of 16 tasks done/)).toBeVisible();
  await page.getByRole("link", { name: /Open your workspace/ }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fapp/);
});

test("old /demo link redirects to the Food Cost demo", async ({ page }) => {
  await page.goto("/demo");
  await expect(page).toHaveURL(/\/food-cost$/);
});
