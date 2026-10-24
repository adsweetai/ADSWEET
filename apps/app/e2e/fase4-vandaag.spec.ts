import { expect, test } from "@playwright/test";
import { login, resetDemo } from "./helpers";

test.describe("fase 4 · Vandaag, meldingen, logboek, weekrapport", () => {
  test("Lisa: samenvatting, Sweetmoment, EuroTegel en de vijf voorstellen", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.reload();
    await expect(page.getByText("Je campagne bracht de afgelopen 7 dagen 11 verkopen op. Eén advertentie houdt je tegen.")).toBeVisible();
    await expect(page.getByText("1 actie nodig")).toBeVisible();
    await expect(page.getByText("2 keer let op")).toBeVisible();
    await expect(page.getByText("Sweet! 3 nieuwe verkopen sinds gisteren.")).toBeVisible();
    const tile = page.locator(".as-eurotile");
    await expect(tile).toContainText("€280");
    await expect(tile).toContainText("€638");
    await expect(tile).toContainText("2,28");
    await expect(tile).toContainText("Je break-even is 2,5");
    await expect(page.locator(".as-action__title")).toHaveText([
      "Lisa, ‘Sfeerbeeld woonkamer’ gaf €72 uit zonder verkoop.",
      "Bij ‘Zo gieten we ze’ werd muziek aangezet in Ads Manager.",
      "Je video’s doen het veel beter dan je foto’s: ROAS 3,41 tegenover 0,91. Maak er deze week nog één.",
      "Over 2,5 week is het Kerstmis. Zal ik een aparte campagne voor de feestdagen klaarzetten?",
      "Je beste video wordt minder aangeklikt: CTR van 2,1% naar 1,4%. Mensen hebben hem al gemiddeld 2,8 keer gezien.",
    ]);
    // Waarom? klapt de rekensom open.
    await page.locator("#kaart-verliezer").getByRole("button", { name: "Waarom?" }).click();
    await expect(page.getByText("3 × €23,20 = €69,60. Deze advertentie gaf €72 uit, zonder één verkoop.")).toBeVisible();
  });

  test("Lisa: Zet hem af schrijft naar het logboek en kan terug", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.reload();
    await page.locator("#kaart-verliezer").getByRole("button", { name: "Zet hem af" }).click();
    await expect(page.getByRole("status").filter({ hasText: "‘Sfeerbeeld woonkamer’ staat af. Dit staat in je logboek." })).toBeVisible();
    await expect(page.getByRole("button", { name: "Verhoog naar €48" })).toBeVisible();
    await expect(page.locator(".vd-lists")).not.toContainText("Sfeerbeeld woonkamer");

    await page.goto("/logboek");
    const row = page.locator(".lb-row").filter({ hasText: "Advertentie ‘Sfeerbeeld woonkamer’ afgezet" });
    await expect(row).toContainText("7 december");
    await expect(row).toContainText("Actief → Uit");
    await row.getByRole("button", { name: "Terugdraaien" }).click();
    await expect(row).toContainText("Teruggedraaid");

    await page.goto("/vandaag");
    await expect(page.locator("#kaart-verliezer")).toBeVisible();
    await expect(page.getByRole("button", { name: "Verhoog naar €48" })).toHaveCount(0);
  });

  test("Lisa: Later schuift een voorstel naar morgen, met Ongedaan maken", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.reload();
    await page.locator("#kaart-speciaal_moment").getByRole("button", { name: "Later" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Verplaatst naar morgen." })).toBeVisible();
    await expect(page.locator("#kaart-speciaal_moment")).toHaveCount(0);
    await page.getByRole("button", { name: "Ongedaan maken" }).click();
    await expect(page.locator("#kaart-speciaal_moment")).toBeVisible();
  });

  test("Tom: aanvragen, doel €20 en het plan-paneel voor een script", async ({ page }) => {
    await login(page, "tom");
    await expect(page.getByText("Je campagne bracht de afgelopen 7 dagen 5 aanvragen op, aan €21,00 per aanvraag. Je doel is €20.")).toBeVisible();
    await expect(page.getByText("2 keer actie nodig")).toBeVisible();
    await expect(page.getByText("1 voorstel")).toBeVisible();
    await expect(page.locator(".as-eurotile")).toContainText("€21,00");
    await expect(page.getByText("Tom, ‘Ons team aan het werk’ gaf €60 uit zonder aanvraag.")).toBeVisible();
    await expect(page.getByText("Je doel per aanvraag is €20. Drie keer dat is €60, en die grens is bereikt.")).toBeVisible();
    await page.locator("#kaart-beste_video").getByRole("button", { name: "Laat een script schrijven" }).click();
    await expect(page.getByRole("dialog", { name: "Dit zit in Pro." })).toBeVisible();
    await expect(page.getByText("Met Pro maakt AdSweet zelf beelden, teksten en videoscripts voor de fase die je mist.")).toBeVisible();
  });

  test("Sarah: dag 1 in de leerfase", async ({ page }) => {
    await login(page, "sarah");
    await expect(page.getByText("Je advertenties lopen sinds gisteren. Morgen weten we meer.")).toBeVisible();
    await expect(page.getByText("Je campagne zit in de leerfase.")).toBeVisible();
    await expect(page.locator(".vd-day1__list li")).toHaveCount(5);
    await expect(page.locator(".vd-day1__list")).toContainText("Wordt nagekeken");
  });

  test("Bram: al je accounts en een account kiezen", async ({ page }) => {
    await login(page, "bram");
    await expect(page.getByText("Je drie webshops brachten de afgelopen 7 dagen 29 verkopen op, voor €2.151 omzet. Proefshop houdt je tegen.")).toBeVisible();
    const table = page.getByRole("region", { name: "Al je accounts" });
    await expect(table).toContainText("€840");
    await expect(table).toContainText("2,56");
    await table.getByRole("button", { name: "Trapkracht" }).click();
    await expect(page.locator(".as-eurotile")).toContainText("Trapkracht · de afgelopen 7 dagen");
    await expect(page.locator(".as-eurotile")).toContainText("1,96");
  });

  test("meldingen met filter en het weekrapport van Tom", async ({ page }) => {
    await login(page, "tom");
    await page.goto("/meldingen?filter=act");
    await expect(page.getByText("Actie nodig · Betaalprobleem bij Meta")).toBeVisible();
    await expect(page.getByText("Let op ·")).toHaveCount(0);
    await page.goto("/weekrapport/2026-12-07");
    await expect(page.getByRole("heading", { level: 2 })).toHaveText(
      "Tom, je week in het kort. Je gaf €105 uit en kreeg 5 aanvragen, €21,00 per aanvraag. Je doel is €20. Vorige week waren het 4 aanvragen aan €26,25.",
    );
    await expect(page.getByText("B1 · Voor en na")).toBeVisible();
    await expect(page.getByText("€34, 3 aanvragen, €11,33 per aanvraag")).toBeVisible();
    await expect(page.getByText("€28, 0 aanvragen. Sinds de start €60, de grens van 3 × €20.")).toBeVisible();
  });

  test("demo: varianten Geen acties en Zonder verkoopdoel", async ({ page }) => {
    await login(page, "lisa");
    await page.getByRole("link", { name: "Geen acties" }).click();
    await expect(page.getByText("Alles loopt zoals het moet. Niets te doen vandaag.")).toBeVisible();
    await page.getByRole("link", { name: "Zonder verkoopdoel" }).click();
    await expect(page.locator(".as-eurotile")).toContainText("[bereik]");
    await expect(page.getByText("Enkel rapportage")).toBeVisible();
  });
});
