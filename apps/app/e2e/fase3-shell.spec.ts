import { expect, test } from "@playwright/test";
import { login } from "./helpers";

const ROUTES: [string, string][] = [
  ["/campagnes", "Campagnes"],
  ["/campagnes/nieuw", "Nieuwe campagne"],
  ["/advertenties", "Advertenties"],
  ["/advertenties/toevoegen", "Nieuwe advertenties toevoegen"],
  ["/advertenties/maken", "Een advertentie maken"],
  ["/bulk", "Bulk launch"],
  ["/testgrid", "Testgrid"],
  ["/google", "Google Ads-campagne"],
  ["/catalogus", "Catalogus-advertenties"],
  ["/studio", "Studio"],
  ["/concurrenten", "Concurrenten"],
  ["/inzichten", "Inzichten"],
  ["/weekrapport/2026-12-07", "Weekrapport"],
  ["/autopilot", "Autopilot en regels"],
  ["/academy", "Academy"],
  ["/begrippen", "Begrippenlijst"],
  ["/hulp", "Hulp"],
  ["/instellingen/profiel", "Instellingen"],
  ["/abonnement", "Instellingen"],
  ["/meldingen", "Meldingen"],
  ["/logboek", "Logboek"],
];

test.describe("fase 3 · app-shell", () => {
  test("alle routes zijn bereikbaar met de juiste titel", async ({ page }) => {
    await login(page, "lisa");
    await expect(page.getByText("Nog 8 dagen gratis. Je eerste betaling is op 16 december.")).toBeVisible();
    for (const [path, title] of ROUTES) {
      await page.goto(path);
      await expect(page.locator(".sh-top__title")).toHaveText(title);
    }
  });

  test("navigatie, bel en periodekiezer", async ({ page }) => {
    await login(page, "lisa");
    const nav = page.getByRole("complementary", { name: "Hoofdmenu" });
    await nav.getByRole("link", { name: "Campagnes" }).click();
    await expect(page).toHaveURL(/\/campagnes$/);
    await expect(nav.getByRole("link", { name: "Campagnes" })).toHaveAttribute("aria-current", "page");

    await page.getByRole("button", { name: "Meldingen" }).click();
    await expect(page.getByText("Bij ‘Zo gieten we ze’ werd muziek aangezet in Ads Manager, op 5 december.")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.getByLabel("Periode").selectOption("30d");
    await page.reload();
    await expect(page.getByLabel("Periode")).toHaveValue("30d");
  });

  test("Starter ziet geen Studio of Concurrenten; de server toont het plan-paneel", async ({ page }) => {
    await login(page, "tom");
    const nav = page.getByRole("complementary", { name: "Hoofdmenu" });
    await expect(nav.getByRole("link", { name: "Studio" })).toHaveCount(0);
    await expect(nav.getByRole("link", { name: "Concurrenten" })).toHaveCount(0);
    await page.goto("/studio");
    await expect(page.getByText("Dit zit in Pro.")).toBeVisible();
    await expect(page.getByRole("alert").filter({ hasText: "Meta kon je laatste betaling niet afschrijven" })).toBeVisible();
  });

  test("Eva wisselt naar een klant en terug", async ({ page }) => {
    await login(page, "eva", "/klanten");
    await page.getByRole("button", { name: /Bureau Kompas/ }).click();
    await page.getByRole("button", { name: /Peeters Dakwerken/ }).click();
    await expect(page).toHaveURL(/\/vandaag$/);
    await expect(page.getByText("Bureau Kompas · klant:")).toBeVisible();
    await expect(page.getByText("Je doel is €20").first()).toBeVisible();
    await page.getByRole("button", { name: "Terug naar alle klanten" }).click();
    await expect(page).toHaveURL(/\/klanten$/);
    await expect(page.getByText("Bureau Kompas · klant:")).toHaveCount(0);
  });

  test("demopaneel: plan wisselen zet de rechten om", async ({ page }) => {
    await login(page, "lisa");
    await page.getByRole("button", { name: "Demo", exact: true }).click();
    await page.getByRole("button", { name: "Starter", exact: true }).click();
    const nav = page.getByRole("complementary", { name: "Hoofdmenu" });
    await expect(nav.getByRole("link", { name: "Studio" })).toHaveCount(0);
    await page.getByRole("button", { name: "Pro", exact: true }).click();
    await expect(nav.getByRole("link", { name: "Studio" })).toBeVisible();
  });

  test("gsm: tabbalk, Meer en geen horizontale scroll", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, "lisa");
    const tabs = page.getByRole("navigation", { name: "Hoofdmenu" });
    await expect(tabs.getByRole("link", { name: "Nieuw" })).toBeVisible();
    await tabs.getByRole("button", { name: "Meer" }).click();
    await page.getByRole("dialog", { name: "Meer" }).getByRole("link", { name: "Academy" }).click();
    await expect(page).toHaveURL(/\/academy$/);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
