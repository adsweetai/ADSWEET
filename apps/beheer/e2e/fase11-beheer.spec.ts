import { expect, test, type Page } from "@playwright/test";

const ADMIN = "team@adsweet.voorbeeld";
const CLIENT = "lisa@ateliernoor.voorbeeld";

async function login(page: Page, email: string) {
  await page.goto("/inloggen");
  await page.getByLabel("E-mail").fill(email);
  await page.getByRole("button", { name: "Stuur me een link" }).click();
  await expect(page.getByRole("heading", { name: "Check je mailbox." })).toBeVisible();
  await page.getByRole("link", { name: "Demo: open de link" }).click();
}

const toast = (page: Page, text: string) => page.getByRole("status").filter({ hasText: text });
const field = (page: Page, label: string) => page.getByRole("textbox", { name: `Waarde voor ${label}` });

// De demodatabase van Beheer leeft zolang de server draait: de tests lopen na elkaar, in deze volgorde.
test.describe.serial("fase 11 · Beheer", () => {
  test("alleen voor adsweet_admin", async ({ page }) => {
    await page.goto("/playbook");
    await expect(page).toHaveURL(/\/inloggen$/);
    await login(page, CLIENT);
    await expect(page).toHaveURL(/\/geen-toegang$/);
    await expect(page.getByRole("heading", { name: "Geen toegang." })).toBeVisible();
    await page.goto("/klanten");
    await expect(page).toHaveURL(/\/geen-toegang$/);
    await expect(page.getByText("Atelier Noor")).toHaveCount(0);
  });

  test("playbook bewerken en publiceren als nieuwe versie", async ({ page }) => {
    await login(page, ADMIN);
    await expect(page).toHaveURL(/\/playbook$/);
    await expect(page.getByText("Je maakt een nieuw concept: versie 1.1. Nu geldt versie 1.0.")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Beheer" }).getByRole("link")).toHaveCount(11);

    // Een startstructuur die niet klopt, wordt geweigerd
    await field(page, "Waarvan foto's").fill("4");
    await page.getByRole("button", { name: "Bewaar het concept" }).first().click();
    await expect(page.getByText("Foto's en video's samen moeten het aantal advertenties zijn.")).toBeVisible();
    await field(page, "Waarvan foto's").fill("3");

    await field(page, "Minimum per dag, webshop (€)").fill("35");
    await page.getByLabel("Notitie bij deze versie").fill("Webshop-minimum naar €35 per dag");
    await page.getByRole("button", { name: "Bewaar het concept" }).first().click();
    await expect(toast(page, "Het concept van versie 1.1 is bewaard.")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Je bewerkt het concept van versie 1.1.")).toBeVisible();
    await expect(field(page, "Minimum per dag, webshop (€)")).toHaveValue("35");

    await page.getByRole("link", { name: "Versies", exact: true }).click();
    const row = (v: string) => page.locator("tbody tr").filter({ has: page.locator("td", { hasText: new RegExp(`^${v.replace(".", "\\.")}$`) }) });
    await expect(row("1.1")).toContainText("Concept");
    await expect(row("1.1")).toContainText("Webshop-minimum naar €35 per dag");
    await expect(page.getByText("Vergelijk 1.0 met 1.1: 1 waarde gewijzigd, 0 regels toegevoegd.")).toBeVisible();
    await expect(page.getByText("Minimum per dag, webshop (€): 30 → 35")).toBeVisible();

    await page.getByRole("button", { name: "Publiceer versie 1.1" }).click();
    await expect(toast(page, "Versie 1.1 is gepubliceerd. De app gebruikt ze meteen.")).toBeVisible();
    await expect(row("1.1")).toContainText("Gepubliceerd");
    await expect(row("1.0")).toContainText("Vervangen");
    await expect(page.getByText("Er is geen concept.", { exact: false })).toBeVisible();

    // Een oude versie terugzetten wordt een nieuw concept
    await page.getByRole("button", { name: "Zet versie 1.0 terug als concept" }).click();
    await expect(toast(page, "De regels van versie 1.0 staan nu in het concept 1.2.")).toBeVisible();
    await page.getByRole("link", { name: "Playbook", exact: true }).click();
    await expect(page.getByText("Je bewerkt het concept van versie 1.2.")).toBeVisible();
    await expect(field(page, "Minimum per dag, webshop (€)")).toHaveValue("30");
  });

  test("klanten, calls, kortingscodes en teksten", async ({ page }) => {
    await login(page, ADMIN);
    await page.goto("/klanten");
    await expect(page.getByText("Founding members: 1 van 50.")).toBeVisible();
    const noor = page.locator("tbody tr").filter({ hasText: "Atelier Noor" });
    await expect(noor).toContainText("€136,50 vanaf 16 december");
    await expect(noor).toContainText("22 van 30");
    await expect(page.locator("tbody tr").filter({ hasText: "Peeters Dakwerken" })).toContainText("Betaalprobleem");

    await page.goto("/calls");
    const call = page.locator("tbody tr").filter({ hasText: "Atelier Noor" });
    await expect(call).toContainText("Te plannen");
    await call.getByLabel("Moment voor Atelier Noor").fill("2026-12-10T10:00");
    await call.getByRole("button", { name: "Plan in" }).click();
    await expect(toast(page, "Gepland: Atelier Noor.")).toBeVisible();
    await expect(call).toContainText("Gepland");
    await expect(call).toContainText("10:00");

    await page.goto("/kortingscodes");
    await expect(page.locator("tbody tr").filter({ hasText: "FOUNDING50" })).toContainText("30%, zolang klant");
    await page.getByLabel("Code", { exact: true }).fill("lente-2027");
    await page.getByRole("button", { name: "Maak de code" }).click();
    await expect(toast(page, "De code LENTE-2027 is aangemaakt.")).toBeVisible();
    await expect(page.locator("tbody tr").filter({ hasText: "LENTE-2027" })).toContainText("1 maand gratis, voor beiden");

    await page.goto("/teksten?q=Goeiemorgen");
    await expect(page.locator("tbody tr").first()).toContainText("Ontbreekt");

    await page.goto("/systeem");
    await expect(page.locator("tbody tr").filter({ hasText: "Dagelijkse audit" })).toContainText("In orde");
  });
});
