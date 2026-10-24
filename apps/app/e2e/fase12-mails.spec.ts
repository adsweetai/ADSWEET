import { expect, test, type Page } from "@playwright/test";
import { login, resetDemo } from "./helpers";

const toast = (page: Page, text: string | RegExp) => page.getByRole("status").filter({ hasText: text });
const sentRow = (page: Page, to: string, subject: string) =>
  page.locator(".ml-mails__sent tbody tr").filter({ hasText: to }).filter({ hasText: subject }).first();

test.describe("fase 12 · mails", () => {
  test("de 12 mails bekijken en verzenden in een testomgeving", async ({ page }) => {
    await login(page, "lisa", "/vandaag");
    await resetDemo(page);
    await page.getByRole("button", { name: "Demo", exact: true }).click();
    await page.getByRole("link", { name: "Mails bekijken" }).click();
    await expect(page).toHaveURL(/\/mails$/);
    const list = page.getByRole("navigation", { name: "Mails" });
    await expect(list.getByRole("button")).toHaveCount(12);
    await expect(page.frameLocator("iframe").getByText("Welkom bij AdSweet, Sarah.")).toBeVisible();
    await list.getByRole("button", { name: /Weekrapport/ }).click();
    const frame = page.frameLocator("iframe");
    await expect(frame.getByText("Tom, je week in het kort.")).toBeVisible();
    await expect(frame.locator("p", { hasText: /Je gaf €105 uit en kreeg 5 aanvragen, €21,00 per aanvraag\./ })).toBeVisible();

    await page.getByRole("button", { name: "Verstuur de 12 mails naar de testomgeving" }).click();
    await expect(toast(page, "12 mails verstuurd naar lisa@ateliernoor.voorbeeld.")).toBeVisible();
    for (const subject of ["Welkom bij AdSweet, Sarah", "Je link om in te loggen", "Je factuur van [datum]", "Je abonnement is opgezegd"])
      await expect(sentRow(page, "lisa@ateliernoor.voorbeeld", subject)).toBeVisible();
  });

  test("uitnodigen en opzeggen sturen een mail", async ({ page }) => {
    await login(page, "lisa", "/team");
    await resetDemo(page);
    await page.reload();
    await page.getByRole("button", { name: "Trek de uitnodiging voor teamlid@ateliernoor.voorbeeld in" }).click();
    await expect(toast(page, "De uitnodiging is ingetrokken.")).toBeVisible();
    await page.getByLabel("Nodig iemand uit").fill("mail@ateliernoor.voorbeeld");
    await page.getByRole("button", { name: "Stuur uitnodiging" }).click();
    await expect(toast(page, "Uitnodiging verstuurd naar mail@ateliernoor.voorbeeld.")).toBeVisible();

    await page.goto("/abonnement");
    await page.getByRole("button", { name: "Ik wil opzeggen" }).click();
    await page.getByRole("button", { name: "Zeg mijn abonnement op" }).click();
    await expect(toast(page, /Je abonnement is opgezegd/)).toBeVisible();

    await page.goto("/mails");
    const invite = sentRow(page, "mail@ateliernoor.voorbeeld", "Lisa nodigt je uit voor Atelier Noor");
    await invite.getByRole("button", { name: "Bekijk" }).click();
    const frame = page.frameLocator("iframe");
    await expect(frame.locator("p", { hasText: "Je rol is Beheerder: je kan alles behalve het abonnement." })).toBeVisible();
    await expect(frame.getByRole("link", { name: "Neem de uitnodiging aan" })).toHaveAttribute("href", /\/uitnodiging\/[0-9a-f]+$/);
    await sentRow(page, "lisa@ateliernoor.voorbeeld", "Je abonnement is opgezegd").getByRole("button", { name: "Bekijk" }).click();
    await expect(
      frame.locator("p", { hasText: "Je abonnement loopt tot woensdag 16 december. Daarna kan je nog 30 dagen je gegevens downloaden." }),
    ).toBeVisible();
  });

  test("de dagelijkse mails: Actie nodig en het weekrapport", async ({ page }) => {
    await login(page, "lisa", "/mails");
    await resetDemo(page);
    await page.reload();
    await page.getByRole("button", { name: "Draai de dagelijkse mails nu" }).click();
    await expect(toast(page, /Dagelijkse mails: \d+ proefperiode, \d+ Actie nodig, \d+ weekrapporten\./)).toBeVisible();
    const week = sentRow(page, "tom@peetersdakwerken.voorbeeld", "Je week in het kort");
    await week.getByRole("button", { name: "Bekijk" }).click();
    const frame = page.frameLocator("iframe");
    await expect(frame.getByText("Tom, je week in het kort.")).toBeVisible();
    await expect(frame.locator("p", { hasText: /aanvragen/ }).first()).toBeVisible();
    await expect(sentRow(page, "lisa@ateliernoor.voorbeeld", "Je week in het kort")).toBeVisible();
    await expect(sentRow(page, "tom@peetersdakwerken.voorbeeld", "Actie nodig:")).toBeVisible();
  });
});
