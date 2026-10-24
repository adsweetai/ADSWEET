import { expect, test } from "@playwright/test";
import { login, resetDemo } from "./helpers";

test.describe("fase 8 · Dot, rondleidingen en vakwoorden", () => {
  test("Starter heeft geen Dot", async ({ page }) => {
    await login(page, "tom");
    await resetDemo(page);
    await expect(page.getByRole("button", { name: "Open Dot, je assistent" })).toHaveCount(0);
    await page.goto("/campagnes/nieuw");
    await expect(page.getByRole("heading", { name: "Wat wil je doen?" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Laat Dot dit voorstellen" })).toHaveCount(0);
  });

  test("Dot antwoordt uit je cijfers en doet niets zonder jouw klik", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.getByRole("button", { name: "Open Dot, je assistent" }).click();
    const panel = page.getByRole("dialog", { name: "Dot" });
    await expect(panel).toContainText("Hoi Lisa, ik ben Dot.");
    await panel.getByRole("button", { name: "Hoe gaat het deze week?" }).click();
    await expect(panel).toContainText(
      "Lisa, je campagne bracht 11 verkopen op voor €280. Je ROAS is 2,28, net onder je break-even van 2,5. Dat komt door één advertentie: ‘Sfeerbeeld woonkamer’.",
    );
    await panel.getByLabel("Vraag iets aan Dot").fill("Zet mijn budget op 50 euro");
    await panel.getByRole("button", { name: "Verstuur" }).click();
    await expect(panel).toContainText("Budget van de vaste campagne: €40 → €50 per dag");
    await panel.getByRole("button", { name: "Doe het" }).click();
    await expect(panel).toContainText("Gedaan. Dit staat in je logboek.");
    await page.goto("/logboek");
    const row = page.locator(".lb-row").first();
    await expect(row).toContainText("Lisa via Dot");
    await expect(row).toContainText("€40 → €50 per dag");
  });

  test("de rondleiding start de eerste keer vanzelf en kan opnieuw via Hulp", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/hulp");
    await page.getByRole("button", { name: "Toon alle uitleg opnieuw bij je volgende bezoek" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Bij je volgende bezoek zie je de uitleg opnieuw." })).toBeVisible();
    await page.goto("/vandaag");
    const tour = page.getByRole("dialog", { name: "Hoi, ik ben Dot." });
    await expect(tour).toBeVisible();
    await expect(tour).toContainText("Stap 1 van 12");
    const card = page.locator(".tour-card");
    for (let i = 0; i < 11; i++) await card.getByRole("button", { name: "Volgende" }).click();
    await expect(page.getByRole("dialog", { name: "Uitleg nodig?" })).toBeVisible();
    await card.getByRole("button", { name: "Klaar" }).click();
    await expect(page.locator(".tour")).toHaveCount(0);
    await page.reload();
    await expect(page.getByText("Goeiemorgen, Lisa")).toBeVisible();
    await page.waitForTimeout(1200);
    await expect(page.locator(".tour")).toHaveCount(0);

    await page.goto("/hulp");
    await page.getByRole("button", { name: "Een campagne lezen" }).click();
    await expect(page.getByRole("dialog", { name: "Je campagne in één oogopslag" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".tour")).toHaveCount(0);
  });

  test("vakwoorden: uitleg met een voorbeeld uit je eigen cijfers", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.reload();
    await page.locator(".as-eurotile").getByText("ROAS", { exact: true }).hover();
    const tip = page.getByRole("tooltip");
    await expect(tip).toContainText("Omzet gedeeld door wat je advertenties kostten.");
    await expect(tip).toContainText("€638 / €280 = 2,28.");
    await expect(tip.getByRole("link", { name: "Meer in de begrippenlijst" })).toBeVisible();
  });

  test("Dot vult de wizard in volgens het playbook", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ reducedMotion: "reduce", baseURL, viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/campagnes/nieuw");
    await page.getByRole("button", { name: "Laat Dot dit voorstellen" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Dot vulde je campagne in volgens het playbook." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nakijken en live zetten" })).toBeVisible();
    await expect(page.getByText("Alles volgt het playbook.")).toBeVisible();
    await page.goto("/logboek");
    await expect(page.locator(".lb-row").first()).toContainText("Campagnewizard ingevuld volgens het playbook");
    await context.close();
  });
});
