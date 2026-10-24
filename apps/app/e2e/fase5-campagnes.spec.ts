import { expect, test } from "@playwright/test";
import { login, resetDemo } from "./helpers";

test.describe("fase 5 · campagnes, wizard en advertenties", () => {
  test("Lisa: campagnelijst en campagnedetail zoals in het prototype", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/campagnes");
    const rows = page.locator("tbody tr");
    await expect(rows.filter({ hasText: "Noor · Vast · Verkopen · nov26" })).toContainText("ROAS 2,28 / 2,5");
    await expect(rows.filter({ hasText: "Black Friday" })).toContainText("ROAS 2,90 / 2,5");
    await expect(rows.filter({ hasText: "Voorjaar 2026 (voorbeeld)" })).toContainText("Buiten AdSweet gemaakt");
    await expect(rows.filter({ hasText: "Voorjaar 2026 (voorbeeld)" })).toContainText("Wijkt af: budget per ad set");

    await page.getByRole("link", { name: "Noor · Vast · Verkopen · nov26" }).click();
    await expect(page.getByRole("heading", { name: "Noor · Vast · Verkopen · nov26" })).toBeVisible();
    await expect(page.getByText("Live sinds 17 november")).toBeVisible();
    await expect(page.locator(".cp-tile")).toContainText("€280");
    await expect(page.locator(".cp-tile")).toContainText("2,28");
    await expect(page.getByText("Lopende ad sets raken we niet aan.").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Verhoog naar €48" })).toBeVisible();

    await page.getByRole("tab", { name: "Instellingen" }).click();
    await expect(page.getByText("Alle uit, behalve muziek bij ‘Zo gieten we ze’")).toBeVisible();
    await expect(page.getByText("Aangezet buiten AdSweet, op 5 december")).toBeVisible();
  });

  test("Lisa: een campagne doorloopt de wizard en verschijnt in de lijst (nog niet naar Meta)", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/campagnes/nieuw");
    await expect(page.getByRole("heading", { name: "Wat wil je doen?" })).toBeVisible();
    await page.getByRole("radio", { name: /Vaste campagne/ }).click();
    const next = page.getByRole("button", { name: "Verder" });
    await next.click(); // Doel
    await expect(page.getByRole("heading", { name: "Doel" })).toBeVisible();
    await next.click(); // Kanaal
    await next.click(); // Structuur
    // Minder advertenties is een afwijking van het playbook: waarschuwing met Toch doorgaan.
    await page.getByRole("button", { name: "Minder advertenties" }).click();
    await expect(page.getByText("Met minder advertenties heeft Meta minder om uit te kiezen")).toBeVisible();
    await page.getByRole("button", { name: "Meer advertenties" }).click();
    await expect(page.getByText("Met minder advertenties heeft Meta minder om uit te kiezen")).toHaveCount(0);
    await next.click(); // Doelgroep
    await expect(page.getByText("Waarom geen interesses?")).toBeVisible();
    await next.click(); // Budget
    await expect(page.getByLabel("Budget per dag (€)")).toHaveValue("40");
    await next.click(); // Advertenties
    await expect(page.getByText("Beeld nodig")).toHaveCount(5);
    await next.click(); // Namen en tracking
    await expect(page.getByLabel("Campagne", { exact: true })).toHaveValue("Noor · Vast · Verkopen · dec26");
    await next.click(); // Nakijken
    await expect(page.getByText("Alles volgt het playbook.")).toBeVisible();
    await page.getByRole("button", { name: "Zet live" }).click();
    await expect(page.getByText("Je campagne is verstuurd. Meta keurt je advertenties eerst goed, daarna gaan ze lopen.")).toBeVisible();
    await page.getByRole("button", { name: "Naar de campagne" }).click();
    await expect(page.getByRole("heading", { name: "Noor · Vast · Verkopen · dec26" })).toBeVisible();
    await expect(page.getByText("Wacht op Meta")).toBeVisible();

    await page.goto("/campagnes");
    const row = page.locator("tbody tr").filter({ hasText: "Noor · Vast · Verkopen · dec26" });
    await expect(row).toContainText("Gepland");
    await expect(row).toContainText("€40");

    await page.goto("/logboek");
    await expect(page.locator(".lb-row").first()).toContainText("Campagne ‘Noor · Vast · Verkopen · dec26’ live gezet, €40 per dag, 5 advertenties");
  });

  test("Lisa: feestdagen vanuit Vandaag, met een afwijking die je bevestigt", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.reload();
    await page.locator("#kaart-speciaal_moment").getByRole("button", { name: "Zet klaar" }).click();
    await expect(page).toHaveURL(/\/campagnes\/nieuw\?strategie=feest/);
    await expect(page.getByText("Dit wordt een aparte campagne naast je vaste.")).toBeVisible();
    const next = page.getByRole("button", { name: "Verder" });
    for (let i = 0; i < 5; i++) await next.click();
    await page.getByLabel("Budget per dag (€)").fill("20");
    await expect(page.getByText("Onder het minimum van €30 per dag.")).toBeVisible();
    await page.getByRole("button", { name: "Toch doorgaan" }).click();
    await expect(page.getByText("Je gaat toch door.")).toBeVisible();
    await next.click();
    await expect(page.getByText("Video, top: een geschenkdoos die opengaat")).toBeVisible();
    await next.click();
    await next.click();
    await expect(page.getByText("Afwijking: budget onder het minimum")).toBeVisible();
    await page.getByRole("button", { name: "Zet live" }).click();
    await page.getByRole("button", { name: "Naar de campagne" }).click();
    await expect(page.getByRole("heading", { name: "Noor · Feestdagen · Verkopen · dec26" })).toBeVisible();
    await expect(page.getByText("Geschenkdoos gaat open")).toBeVisible();
  });

  test("Lisa: advertentiepaneel, Afzetten met bevestiging", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/advertenties");
    await page.getByRole("button", { name: /A4 · Sfeerbeeld woonkamer/ }).click();
    const panel = page.getByRole("dialog", { name: "A4 · Sfeerbeeld woonkamer" });
    await expect(panel).toContainText("Je maximale kost per verkoop is €23,20. Drie keer dat is €69,60. Deze advertentie gaf €72 uit zonder verkoop.");
    await expect(panel).toContainText("[uit Meta]");
    await panel.getByRole("button", { name: "Afzetten" }).click();
    await expect(panel.getByText("Zet je ‘Sfeerbeeld woonkamer’ af?")).toBeVisible();
    await panel.getByRole("button", { name: "Ja, zet af" }).click();
    await expect(page.getByRole("status").filter({ hasText: "‘Sfeerbeeld woonkamer’ staat af." })).toBeVisible();
    await expect(panel).toHaveCount(0);
    await page.goto("/vandaag");
    await expect(page.getByRole("button", { name: "Verhoog naar €48" })).toBeVisible();
  });

  test("Lisa: een advertentie maken komt in een nieuwe ad set", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/advertenties/toevoegen");
    await page.getByRole("radio", { name: /In een bestaande ad set zetten/ }).click();
    await expect(page.getByText("Nieuwe advertenties in een lopende ad set zetten die ad set terug in de leerfase.")).toBeVisible();
    await page.getByRole("radio", { name: /In een nieuwe ad set/ }).click();
    await page.getByRole("link", { name: "Verder: maak de advertenties" }).click();
    await page.getByRole("button", { name: "Demo: gebruik een voorbeeldvideo" }).click();
    await expect(page.getByText("1080 × 1920")).toBeVisible();
    await expect(page.getByText("AdSweet stelt bottom of funnel voor")).toBeVisible();
    await expect(page.getByRole("button", { name: "Schrijf opnieuw" })).toBeVisible();
    await page.getByRole("button", { name: "Zet live in een nieuwe ad set" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Je advertentie staat klaar in een nieuwe ad set." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Noor · Vast · Verkopen · nov26" })).toBeVisible();
    await expect(page.getByText("AS2 · 07-12-2026 · nieuwe advertenties")).toBeVisible();
    await expect(page.getByText("A6 · Geschenkdoos gaat open")).toBeVisible();
  });

  test("Tom (Starter): geen AI-knoppen bij een advertentie maken", async ({ page }) => {
    await login(page, "tom");
    await resetDemo(page);
    await page.goto("/advertenties/maken");
    await page.getByRole("button", { name: "Demo: gebruik een voorbeeldvideo" }).click();
    await expect(page.getByLabel("Primaire tekst")).toBeVisible();
    await expect(page.getByRole("button", { name: "Schrijf opnieuw" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Maak met AI" })).toHaveCount(0);
  });

  test("Preview-link: je vennoot keurt goed zonder account", async ({ page, browser }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.goto("/campagnes");
    await page.getByRole("link", { name: "Noor · Vast · Verkopen · nov26" }).click();
    await page.getByRole("link", { name: "Preview-link delen" }).click();
    const text = await page.locator(".pl-link span").first().innerText();
    const code = text.match(/\/p\/([a-f0-9]+)/)?.[1];
    expect(code).toBeTruthy();

    const guest = await browser.newContext();
    const other = await guest.newPage();
    await other.goto(`${new URL(page.url()).origin}/p/${code}`);
    await expect(other.getByText("Lisa vraagt je deze advertenties na te kijken.")).toBeVisible();
    await other.locator(".pl-ad").filter({ hasText: "A1 · Kaars wordt aangestoken" }).getByRole("button", { name: "Goedgekeurd" }).click();
    await expect(other.getByText("Bedankt. Lisa ziet je antwoord in de campagne.")).toBeVisible();
    await guest.close();

    await page.reload();
    await expect(page.getByText("1 goedgekeurd · 0 opmerkingen")).toBeVisible();
  });

  test("gsm: geen horizontale scroll op de schermen van fase 5", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page, "lisa");
    await resetDemo(page);
    for (const url of ["/campagnes", "/campagnes/nieuw", "/advertenties", "/advertenties/toevoegen", "/advertenties/maken", "/bulk", "/testgrid"]) {
      await page.goto(url);
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, url).toBeLessThanOrEqual(375);
    }
  });
});
