import { expect, test } from "@playwright/test";
import { login, resetDemo } from "./helpers";

const CLIENTS = ["Atelier Noor", "Peeters Dakwerken", "Salon Mila", "Veld & Vuur", "Trapkracht", "Proefshop"];

test.describe("fase 9 · Agency", () => {
  test("klantenoverzicht met cijfers uit de data van elke klant", async ({ page }) => {
    await login(page, "eva", "/klanten");
    await resetDemo(page);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Goeiemorgen, Eva" })).toBeVisible();
    await expect(page.getByText("Bureau Kompas beheert 6 klanten. Bij 2 is er vandaag actie nodig: Peeters Dakwerken en Proefshop.")).toBeVisible();
    const kpi = (k: string) => page.locator(".kl-kpi").filter({ hasText: k });
    await expect(kpi("Uitgegeven")).toContainText("€1.225");
    await expect(kpi("Open voorstellen")).toContainText("11");
    const row = (n: string) => page.locator(".kl-table tbody tr").filter({ hasText: n });
    await expect(row("Atelier Noor")).toContainText("11 verkopen");
    await expect(row("Atelier Noor")).toContainText("ROAS 2,28");
    await expect(row("Peeters Dakwerken")).toContainText("€21,00 per aanvraag");
    await expect(row("Salon Mila")).toContainText("Leerfase");
    await expect(page.getByText("Meta kon de laatste betaling van Peeters Dakwerken niet afschrijven.")).toBeVisible();
    await page.getByRole("button", { name: "Actie nodig", exact: true }).click();
    await expect(page.locator(".kl-table tbody tr")).toHaveCount(2);
  });

  test("Eva wisselt tussen haar 6 klanten", async ({ page }) => {
    await login(page, "eva", "/klanten");
    await resetDemo(page);
    for (const name of CLIENTS) {
      await page.goto("/klanten");
      await page.getByRole("button", { name: `Open ${name}` }).click();
      await expect(page).toHaveURL(/\/vandaag$/);
      await expect(page.locator(".sh-client")).toContainText(name);
      await page.getByRole("button", { name: "Terug naar alle klanten" }).click();
      await expect(page).toHaveURL(/\/klanten$/);
    }
  });

  test("een nieuwe klant toevoegen met een uitnodiging", async ({ page }) => {
    await login(page, "eva", "/klanten");
    await resetDemo(page);
    await page.reload();
    await page.getByRole("button", { name: "Nieuwe klant toevoegen" }).click();
    const dialog = page.getByRole("dialog", { name: "Nieuwe klant toevoegen" });
    await dialog.getByLabel("Naam van de zaak").fill("Bakkerij Lente");
    await dialog.getByLabel("E-mail van je klant").fill("lente@bakkerij.voorbeeld");
    await dialog.getByRole("button", { name: "Voeg toe en stuur de uitnodiging" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Bakkerij Lente is toegevoegd. De uitnodiging is verstuurd." })).toBeVisible();
    await expect(page.locator(".kl-table tbody tr").filter({ hasText: "Bakkerij Lente" })).toContainText("Onboarding");
    await expect(page.getByText("7 van 10 accounts in je staffel")).toBeVisible();
  });

  test("rechten per klant: een teamlid ziet een klant niet meer", async ({ page }) => {
    await login(page, "eva", "/klanten");
    await resetDemo(page);
    await page.goto("/team");
    await page.getByLabel("Rechten van Teamlid voor Proefshop").selectOption("geen");
    await expect(page.getByRole("status").filter({ hasText: "Bewaard. De rechten gelden meteen." })).toBeVisible();
    await page.getByLabel("Rechten van Teamlid voor Salon Mila").selectOption("lezer");
    await expect(page.getByLabel("Rechten van Teamlid voor Salon Mila")).toHaveValue("lezer");

    await page.context().clearCookies();
    await login(page, "kompasTeam", "/klanten");
    const rows = page.locator(".kl-table tbody tr");
    await expect(rows).toHaveCount(5);
    await expect(rows.filter({ hasText: "Proefshop" })).toHaveCount(0);
  });
});
