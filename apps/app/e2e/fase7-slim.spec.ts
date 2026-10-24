import { expect, test } from "@playwright/test";
import { login, resetDemo } from "./helpers";

test.describe("fase 7 · Studio, Concurrenten, Inzichten, Autopilot en plangating", () => {
  test("Starter ziet geen AI: Studio, Concurrenten en live Inzichten zitten in Pro", async ({ page }) => {
    await login(page, "tom");
    await resetDemo(page);
    for (const url of ["/studio", "/concurrenten"]) {
      await page.goto(url);
      await expect(page.getByText("Dit zit in Pro.")).toBeVisible();
      await expect(page.getByRole("button", { name: /Maak een beeld|Voeg toe/ })).toHaveCount(0);
    }
    await page.goto("/inzichten");
    await expect(page.getByText("Dit zit in Pro.")).toBeVisible();
    await expect(page.getByText("Alle cijfers uit Meta.")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Naar je weekrapport" })).toBeVisible();
  });

  test("Pro: Studio verbruikt credits en weigert als ze op zijn", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/studio");
    await expect(page.getByText("Nog 18 van je 50 credits in je proefperiode")).toBeVisible();
    await page.getByRole("button", { name: "Schrijf teksten" }).click();
    await expect(page.getByText("Een geschenk dat blijft branden. Elke doos stellen we met de hand samen.")).toBeVisible();
    await expect(page.getByText("Nog 17 van je 50 credits in je proefperiode")).toBeVisible();
    await page.getByRole("button", { name: "Maak een beeld" }).click();
    await expect(page.getByText("AI-beeld 4:5 · de geschenkdoos op een houten tafel, zacht licht, zonder tekst")).toBeVisible();
    await expect(page.getByText("Nog 7 van je 50 credits in je proefperiode")).toBeVisible();
    await page.getByRole("button", { name: "Maak een beeld" }).click();
    await expect(page.getByText(/Dit kost 10 credits en je hebt er nog 7\./)).toBeVisible();
  });

  test("Pro: Inzichten rekent alle cijfers uit de data", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/inzichten");
    await expect(page.getByText("Alle cijfers uit Meta.")).toBeVisible();
    const tile = (k: string) => page.locator(".iz-tile").filter({ has: page.locator(".iz-tile__k", { hasText: new RegExp(`^${k}$`) }) });
    await expect(tile("Uitgegeven")).toContainText("€280,00");
    await expect(tile("Omzet")).toContainText("€638,00");
    await expect(tile("ROAS")).toContainText("2,28");
    await expect(tile("Kost per verkoop")).toContainText("€25,45");
    await expect(tile("Linkklikken")).toContainText("412");
    await expect(tile("Kost per klik")).toContainText("€0,68");
    await expect(tile("CPM")).toContainText("€7,61");
    await expect(tile("Frequentie")).toContainText("2,8");
    await expect(tile("Link-CTR")).toContainText("1,12%");
    await expect(page.locator(".iz-funnel")).toContainText("298");
    await expect(page.locator(".iz-table")).toContainText("Black Friday");
    await page.getByRole("tab", { name: "Advertenties" }).click();
    await expect(page.getByText("Kaars wordt aangestoken")).toBeVisible();
    await expect(page.getByText("€153 → €522 · ROAS 3,41")).toBeVisible();
  });

  test("Pro: Concurrenten toevoegen en de creative-strateeg", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/concurrenten");
    await expect(page.getByText("Concurrent A", { exact: true })).toBeVisible();
    await expect(page.getByText("De cadeaugever")).toBeVisible();
    await page.getByLabel("Voeg een concurrent toe").fill("Kaarsenhuis");
    await page.getByRole("button", { name: "Voeg toe" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Concurrent toegevoegd." })).toBeVisible();
    await expect(page.locator(".co-card").filter({ hasText: "Kaarsenhuis" })).toBeVisible();
  });

  test("Autopilot: grenzen, nooit zelf afzetten, regels en sjablonen", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/autopilot");
    await expect(page.getByText("Als kost per verkoop hoger is dan €30, 2 dagen na elkaar, dan stuur me een melding.")).toBeVisible();
    await page.getByRole("radio", { name: /Doe het binnen mijn grenzen/ }).click();
    await expect(page.getByRole("switch", { name: "Een advertentie afzetten" })).toBeDisabled();
    await expect(page.getByRole("switch", { name: "Een advertentie afzetten" })).toHaveAttribute("aria-checked", "false");
    await page.getByLabel("Meetwaarde").selectOption("roas");
    await page.getByLabel("Vergelijking").selectOption("lager");
    await page.getByLabel("Waarde", { exact: true }).fill("2");
    await page.getByRole("button", { name: "Bewaar de regel" }).click();
    await expect(page.getByText("Als ROAS lager is dan 2, 2 dagen na elkaar, dan stuur me een melding.")).toBeVisible();
    await page.getByRole("button", { name: "Budget op" }).click();
    await expect(page.getByText("Als uitgaven per dag hoger is dan [je budget], 1 dag, dan stuur me een melding.")).toBeVisible();
    await page.goto("/logboek");
    await expect(page.locator(".lb-row").first()).toContainText("Autopilot gewijzigd");
    await expect(page.locator(".lb-row").first()).toContainText("Vraag het mij eerst → Doe het binnen mijn grenzen");
  });
});
