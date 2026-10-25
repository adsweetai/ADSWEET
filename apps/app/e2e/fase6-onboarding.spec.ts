import { expect, test } from "@playwright/test";
import { login, resetDemo } from "./helpers";

test.describe("fase 6 · inloggen, onboarding en het onboardingpaneel", () => {
  test("een nieuwe gebruiker komt van account maken tot Vandaag", async ({ page }) => {
    await page.goto("/account-maken");
    await expect(page.getByRole("heading", { name: "Maak je account." })).toBeVisible();
    const fb = page.getByRole("button", { name: "Doorgaan met Facebook" });
    await expect(fb).toBeDisabled();
    await page.getByRole("checkbox").check();
    await fb.click();
    await expect(page.getByRole("dialog", { name: "Meta opent nu een venster." })).toBeVisible();
    await page.getByRole("button", { name: "Toegang gegeven", exact: true }).click();

    // Eerst in de app: Vandaag, met de rondleiding van Dot. De laatste stap is de onboarding.
    await expect(page).toHaveURL(/\/vandaag$/);
    await expect(page.getByRole("dialog", { name: "Hoi, ik ben Dot." })).toBeVisible();
    const last = page.getByRole("dialog", { name: "Nog één ding: je onboarding." });
    for (let i = 0; i < 20 && !(await last.isVisible()); i++) await page.getByRole("button", { name: "Volgende" }).click();
    await last.getByRole("button", { name: "Start de onboarding" }).click();

    // 1 · Welkom
    await expect(page).toHaveURL(/\/onboarding\/1$/);
    await expect(page.getByRole("heading", { name: "Welkom, Sarah." })).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();

    // 2 · Je website
    await expect(page.getByRole("heading", { name: "Wat is je website?" })).toBeVisible();
    await page.getByLabel("Je website").fill("salonmila.voorbeeld");
    await page.getByRole("button", { name: "Lees mijn website" }).click();
    await expect(page.getByText("Dit vonden we. Je kijkt het na in de volgende stap.")).toBeVisible();
    await expect(page.getByText("Hasselt · [adres] · [telefoon]")).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();

    // 3 · Je bedrijfsprofiel
    await expect(page.getByRole("heading", { name: "Je bedrijfsprofiel" })).toBeVisible();
    await expect(page.getByText("Knippen dames €48 · Kleuren vanaf €75 · Balayage vanaf €120")).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();

    // 4 · Wat wil je bereiken?
    await page.getByRole("radio", { name: /Meer mensen in je zaak/ }).click();
    await expect(page.getByText("Wat wil je vooral?")).toBeVisible();
    await expect(page.getByLabel("Gemeente")).toHaveValue("Hasselt");
    await page.getByRole("button", { name: "Verder" }).click();

    // 5 · Je cijfers (Sarah: klantwaarde €360, 50%, 1 op 4)
    await expect(page.getByRole("heading", { name: "Je cijfers" })).toBeVisible();
    await expect(page.getByText("Tot €45 per aanvraag verdien je je advertentie terug.")).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();

    // 6 · Koppelen
    await expect(page.getByRole("heading", { name: "Koppelen" })).toBeVisible();
    await page.getByRole("button", { name: "Koppel met Facebook" }).click();
    await page.getByRole("button", { name: "Toegang gegeven", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Controles" })).toBeVisible();
    await expect(page.getByText("Je pixel meet aanvragen (laatste 7 dagen)")).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();

    // 8 · Je strategie (stap 7 valt weg zonder bestaande campagnes)
    await expect(page.getByRole("heading", { name: "Sarah, zo zouden wij het aanpakken." })).toBeVisible();
    await expect(page.getByText("Hasselt plus 15 km, Nederlandstalig, 18 tot 65+")).toBeVisible();
    await expect(page.getByText("Een balayage van dichtbij, in daglicht.")).toBeVisible();
    await page.getByRole("button", { name: "Ziet er goed uit" }).click();

    // 9 · Je eerste campagne
    await expect(page.getByRole("heading", { name: "Je eerste campagne" })).toBeVisible();
    await expect(page.getByLabel("Budget per dag")).toHaveValue("10");
    await page.getByRole("button", { name: "Keur goed" }).click();

    // 10 · Je plan en je proefperiode
    await expect(page.getByRole("heading", { name: "Je plan en je proefperiode" })).toBeVisible();
    await expect(page.getByText(/Vandaag betaal je niets\. Op 6 januari betaal je €195 \+ €40,95 btw = €235,95 per maand/)).toBeVisible();
    await page.getByRole("button", { name: "Ga naar de betaalpagina" }).click();
    await page.getByRole("button", { name: "Demo: betaling geslaagd, terug naar AdSweet" }).click();
    await expect(page.getByText(/Je proefperiode loopt\. Je hebt 30 dagen\./)).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();

    // 11 · Live
    await page.getByRole("button", { name: "Zet mijn campagne live" }).click();
    await expect(page.getByRole("heading", { name: "Je campagne is verstuurd." })).toBeVisible();
    await page.getByRole("button", { name: "Naar Vandaag" }).click();
    await expect(page).toHaveURL(/\/vandaag$/);
    await expect(page.getByText("Goeiemorgen, Sarah")).toBeVisible();

    await page.goto("/campagnes");
    await expect(page.locator("tbody tr").filter({ hasText: "Salon Mila · Vast · Aanvragen · dec26" })).toContainText("Gepland");
  });

  test("zonder onboarding staat wat je gegevens nodig heeft op slot, met uitleg", async ({ page }) => {
    await page.goto("/account-maken");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Doorgaan met Facebook" }).click();
    await page.getByRole("button", { name: "Toegang gegeven", exact: true }).click();
    await expect(page).toHaveURL(/\/vandaag$/);
    await page.getByRole("button", { name: "Sla over" }).click();

    await expect(page.getByText("Welkom bij AdSweet. Vul je onboarding in")).toBeVisible();
    const campaigns = page.getByRole("complementary").getByRole("button", { name: "Campagnes" });
    await expect(campaigns).toHaveAttribute("aria-disabled", "true");
    await expect(campaigns).toHaveAccessibleDescription("Je moet eerst de onboarding invullen.");
    await campaigns.hover();
    await expect(campaigns.getByRole("tooltip", { includeHidden: true })).toHaveCSS("opacity", "1");
    await expect(page.getByRole("button", { name: "Nieuwe campagne" })).toHaveAttribute("aria-disabled", "true");

    // aria-disabled: Playwright wacht anders op "ingeschakeld"; de knop opent het paneel met uitleg.
    await campaigns.click({ force: true });
    const gate = page.getByRole("dialog", { name: "Vul eerst je onboarding in." });
    await expect(gate).toBeVisible();
    await gate.getByRole("button", { name: "Sluiten" }).click();

    // Ook op de server: rechtstreeks naar een scherm op slot brengt je terug naar Vandaag.
    await page.goto("/campagnes/nieuw");
    await expect(page).toHaveURL(/\/vandaag$/);

    await page.getByRole("link", { name: "Start de onboarding" }).click();
    await expect(page).toHaveURL(/\/onboarding\/1$/);
    await expect(page.getByText("Hoi, ik ben Dot. In een paar korte stappen leer ik je zaak kennen.")).toBeVisible();
    await page.getByRole("link", { name: "Terug naar AdSweet" }).click();
    await expect(page).toHaveURL(/\/vandaag$/);
  });

  test("Meta zonder toestemming toont de fout en Opnieuw proberen", async ({ page }) => {
    await page.goto("/account-maken");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Doorgaan met Facebook" }).click();
    await page.getByRole("button", { name: "Geen toestemming" }).click();
    await expect(page.getByRole("heading", { name: "Zonder toegang tot je advertentieaccount kunnen we niets voor je klaarzetten." })).toBeVisible();
    await expect(page.getByText("Actie nodig")).toBeVisible();
  });

  test("uitnodiging: het teamlid komt meteen op Vandaag van Atelier Noor", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.context().clearCookies();
    await page.goto("/uitnodiging/demo-noor-teamlid");
    await expect(page.getByRole("heading", { name: "Lisa nodigt je uit voor Atelier Noor op AdSweet." })).toBeVisible();
    await expect(page.getByText("Je rol: Beheerder. Je kan alles behalve het abonnement.")).toBeVisible();
    await page.getByRole("button", { name: "Doorgaan met e-mail" }).click();
    await expect(page.getByRole("heading", { name: "Check je mailbox." })).toBeVisible();
    await page.getByRole("link", { name: "Demo: open de link" }).click();
    await expect(page).toHaveURL(/\/vandaag$/);
    await expect(page.getByText("Goeiemorgen, Teamlid")).toBeVisible();
    await expect(page.getByRole("button", { name: /Atelier Noor/ }).first()).toBeVisible();
  });

  test("testfase: wachtlijst in plaats van account maken", async ({ page, baseURL }) => {
    await page.context().addCookies([{ name: "as-demo-staat", value: "testfase", url: baseURL! }]);
    await page.goto("/account-maken");
    await expect(page.getByRole("heading", { name: "AdSweet is nog in testfase." })).toBeVisible();
    await page.getByRole("textbox", { name: "Naam" }).fill("Jan");
    await page.getByRole("textbox", { name: "E-mail" }).fill("jan@voorbeeld.be");
    await page.getByRole("textbox", { name: "Website" }).fill("janszaak.be");
    await page.getByRole("button", { name: "Zet me op de lijst" }).click();
    await expect(page.getByText("Je staat op de lijst.")).toBeVisible();
  });

  test("onboardingpaneel: Lisa stemt AdSweet af in 8 stappen", async ({ page }) => {
    await login(page, "lisa");
    await resetDemo(page);
    await page.reload();
    await page.getByRole("link", { name: /Stem AdSweet af op je zaak/ }).click();
    await expect(page).toHaveURL(/\/afstemmen\/1$/);
    await expect(page.getByText("Stem AdSweet af op Atelier Noor")).toBeVisible();
    await page.getByLabel("Je website").fill("ateliernoor.voorbeeld");
    await page.getByRole("button", { name: "Lees mijn website" }).click();
    await expect(page.getByText("Dit vonden we. Klopt iets niet, dan pas je het later aan.")).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();
    // 2 · Brandguide is optioneel
    await expect(page.getByRole("heading", { name: "Je brandguide" })).toBeVisible();
    await page.getByRole("button", { name: "Sla over" }).click();
    // 3 · Documenten
    await page.getByRole("button", { name: "Demo: voeg voorbeeldbestanden toe" }).click();
    await expect(page.getByText("prijslijst-2026.xlsx")).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();
    // 4 · Beelden, 5 · Aanbod, 6 · Toon, 7 · Doelen
    await expect(page.getByRole("heading", { name: "Je beelden" })).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();
    await expect(page.getByRole("heading", { name: "Je aanbod" })).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();
    await expect(page.getByRole("heading", { name: "Je toon" })).toBeVisible();
    await expect(page.getByText("Een geschenk dat blijft branden.")).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();
    await expect(page.getByText(/Bij 40% marge verdien je je advertentie terug vanaf een ROAS van 2,5/)).toBeVisible();
    await page.getByRole("button", { name: "Verder" }).click();
    // 8 · Klaar
    await expect(page.getByRole("heading", { name: "Zo kent AdSweet je nu." })).toBeVisible();
    await page.getByRole("button", { name: "Naar Vandaag" }).click();
    await expect(page).toHaveURL(/\/vandaag$/);
    await expect(page.getByRole("link", { name: /Stem AdSweet af op je zaak/ })).toHaveCount(0);
  });
});
