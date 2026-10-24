import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/inloggen");
  await page.getByRole("button", { name: "Inloggen met e-mail" }).click();
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Stuur me een link" }).click();
  await expect(page.getByRole("heading", { name: "Check je mailbox." })).toBeVisible();
  await page.getByRole("link", { name: "Demo: open de link" }).click();
  await expect(page).toHaveURL(/\/vandaag$/);
}

test.describe("letter en kleuren", () => {
  test("licht en nacht volgen het toestel, een eigen keuze wint", async ({ page, context }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/inloggen");
    const body = page.locator("body");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(body).toHaveCSS("background-color", "rgb(234, 232, 227)");
    expect(await body.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Host Grotesk");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('500 16px "Host Grotesk"'))).toBe(true);

    await page.emulateMedia({ colorScheme: "dark" });
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(body).toHaveCSS("background-color", "rgb(17, 17, 16)");

    await context.addCookies([{ name: "as-theme", value: "light", url: page.url() }]);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

test.describe("fase 1 · inloggen met e-mail", () => {
  test("zonder sessie ga je naar inloggen", async ({ page }) => {
    await page.goto("/vandaag");
    await expect(page).toHaveURL(/\/inloggen$/);
    await expect(page.getByRole("heading", { name: "Welkom terug." })).toBeVisible();
  });

  test("Lisa logt in en ziet haar eigen organisatie", async ({ page }) => {
    await login(page, "lisa@ateliernoor.voorbeeld");
    await expect(page.getByRole("heading", { name: "Goeiemorgen, Lisa" })).toBeVisible();
    await expect(page.getByTestId("org-name")).toHaveText("Atelier Noor");
    await page.getByRole("button", { name: "Uitloggen" }).click();
    await expect(page).toHaveURL(/\/inloggen$/);
  });

  test("Tom ziet Peeters Dakwerken, niet Atelier Noor", async ({ page }) => {
    await login(page, "tom@peetersdakwerken.voorbeeld");
    await expect(page.getByTestId("org-name")).toHaveText("Peeters Dakwerken");
    await expect(page.getByText("Atelier Noor")).toHaveCount(0);
  });

  test("Eva ziet Bureau Kompas met 6 klanten", async ({ page }) => {
    await login(page, "eva@bureaukompas.voorbeeld");
    await expect(page.getByTestId("org-name")).toHaveText("Bureau Kompas");
    await expect(page.getByText(/6 klanten/)).toBeVisible();
  });

  test("een ongeldige link stuurt terug naar inloggen", async ({ page }) => {
    await page.goto("/auth/callback?token=vals&next=/vandaag");
    await expect(page).toHaveURL(/\/inloggen\?fout=link$/);
    await expect(page.getByText("Deze link werkt niet meer. Vraag een nieuwe aan.")).toBeVisible();
  });
});
