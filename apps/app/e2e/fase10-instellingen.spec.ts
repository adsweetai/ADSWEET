import { expect, test, type Page } from "@playwright/test";
import { login, resetDemo } from "./helpers";

const toast = (page: Page, text: string | RegExp) => page.getByRole("status").filter({ hasText: text });

test.describe("fase 10 · Academy, Hulp, Instellingen, Abonnement, Team en Doorverwijzen", () => {
  test("alle instellingen bewaren in Supabase", async ({ page }) => {
    await login(page, "lisa", "/instellingen/profiel");
    await resetDemo(page);
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Instellingen" }).getByRole("link")).toHaveCount(14);

    // Bedrijfsprofiel
    await page.getByLabel("Wat maakt jou anders?").fill("Elke kaars met de hand gegoten in Gent");
    await page.getByRole("button", { name: "Bewaar" }).click();
    await expect(toast(page, "Bewaard.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Wat maakt jou anders?")).toHaveValue("Elke kaars met de hand gegoten in Gent");

    // Cijfers en doelen: de rekenkaart rekent mee, en het blijft na herladen
    await page.goto("/instellingen/cijfers");
    await expect(
      page.getByText("Bij 40% marge verdien je je advertentie terug vanaf een ROAS van 2,5. Een verkoop mag je hoogstens €23,20 kosten."),
    ).toBeVisible();
    await page.getByLabel("Brutomarge (%)").fill("50");
    await expect(
      page.getByText("Bij 50% marge verdien je je advertentie terug vanaf een ROAS van 2. Een verkoop mag je hoogstens €29,00 kosten."),
    ).toBeVisible();
    await page.getByRole("button", { name: "Bewaar" }).click();
    await expect(toast(page, "Bewaard. Je drempels passen meteen mee.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Brutomarge (%)")).toHaveValue("50");

    // Naamgeving: live voorbeeld en bewaren
    await page.goto("/instellingen/naamgeving");
    await expect(page.getByText("Noor · Vast · Verkopen · nov26")).toBeVisible();
    await expect(page.getByText("utm_source=meta, utm_medium=paid_social, utm_campaign=noor-vast-verkopen, utm_content=a1-top-video")).toBeVisible();
    await page.getByLabel("Campagne", { exact: true }).fill("{zaak} | {doel} | {maand}");
    await expect(page.getByText("Noor | Verkopen | nov26")).toBeVisible();
    await page.getByRole("button", { name: "Bewaar" }).click();
    await expect(toast(page, "Bewaard.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Campagne", { exact: true })).toHaveValue("{zaak} | {doel} | {maand}");

    // Wie betaalt
    await page.goto("/instellingen/betaler");
    await page.getByRole("textbox", { name: "Wie betaalt" }).fill("Atelier Noor bv");
    await page.getByRole("button", { name: "Bewaar" }).click();
    await expect(toast(page, "Bewaard. Dit vraagt de EU bij elke advertentie.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Wie betaalt" })).toHaveValue("Atelier Noor bv");

    // Meldingen: uit is uit, ook in Meldingen
    await page.goto("/meldingen");
    await expect(page.getByText(/Je beste video wordt minder aangeklikt/)).toBeVisible();
    await page.goto("/instellingen/meldingen");
    await page.getByRole("switch", { name: "Creative-vermoeidheid" }).click();
    await expect(toast(page, /Creative-vermoeidheid: uit/)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("switch", { name: "Creative-vermoeidheid" })).toHaveAttribute("aria-checked", "false");
    await page.goto("/meldingen");
    await expect(page.getByText(/Je beste video wordt minder aangeklikt/)).toHaveCount(0);

    // Taal en regio: alleen Nederlands, de tijdzone bewaart
    await page.goto("/instellingen/taal");
    await expect(page.getByRole("button", { name: "FR" })).toHaveAttribute("aria-disabled", "true");
    await page.getByLabel("Tijdzone").selectOption("Europe/Amsterdam");
    await expect(toast(page, "Bewaard. Tijden staan nu in Europe/Amsterdam.")).toBeVisible();
    await page.reload();
    await expect(page.getByLabel("Tijdzone")).toHaveValue("Europe/Amsterdam");

    // Het playbook: alleen lezen, uit de gepubliceerde versie
    await page.goto("/instellingen/playbook");
    await expect(page.getByText("Minimum €10 per dag, €30 voor een webshop")).toBeVisible();
    await expect(page.getByText("1 ad set met 5 advertenties: 3 foto's en 2 video's")).toBeVisible();
    await expect(page.getByText(/Alleen lezen\. Zo werkt AdSweet · versie 1\.0/)).toBeVisible();
  });

  test("koppelingen en privacy", async ({ page }) => {
    await login(page, "lisa", "/instellingen/koppelingen");
    await resetDemo(page);
    await page.reload();
    const meta = page.locator(".st-row").filter({ hasText: "Meta" }).first();
    await expect(meta).toContainText("In orde");
    await meta.getByRole("button", { name: "Loskoppelen" }).click();
    await page.getByRole("button", { name: "Koppel los" }).click();
    await expect(toast(page, "Meta is losgekoppeld.")).toBeVisible();
    await expect(meta).toContainText("Losgekoppeld");
    await meta.getByRole("button", { name: "Koppel", exact: true }).click();
    await expect(toast(page, "Meta is opnieuw gekoppeld.")).toBeVisible();
    await expect(meta).toContainText("In orde");

    await page.goto("/instellingen/privacy");
    const res = await page.request.get("/api/export");
    expect(res.status()).toBe(200);
    const data = (await res.json()) as { organization: { name: string }; campaigns: unknown[] };
    expect(data.organization.name).toBe("Atelier Noor");
    expect(data.campaigns.length).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Verwijder", exact: true }).click();
    await page.getByRole("button", { name: "Verwijder mijn account" }).click();
    await expect(page.getByText("Aangevraagd op maandag 7 december. We verwijderen je account en je gegevens binnen [termijn].")).toBeVisible();
    await page.getByRole("button", { name: "Toch niet verwijderen" }).click();
    await expect(toast(page, "Je account blijft bestaan.")).toBeVisible();
  });

  test("abonnement: plan wisselen, jaarlijks en opzeggen", async ({ page }) => {
    await login(page, "lisa", "/abonnement");
    await resetDemo(page);
    await page.reload();
    const fact = (k: string) => page.locator(".sb-fact").filter({ hasText: k });
    await expect(fact("Prijs")).toContainText("€136,50 per maand");
    await expect(fact("Prijs")).toContainText("founding member, 30% korting");
    await expect(fact("Status")).toContainText("Dag 22 van 30");
    await expect(fact("Volgende betaling")).toContainText("16 december");
    await expect(page.getByText("Nog geen facturen. Je eerste factuur komt op 16 december.")).toBeVisible();

    await page.getByRole("button", { name: "Wissel van plan" }).click();
    await page.getByRole("radio", { name: /^Scale/ }).click();
    await expect(page.getByText("Nieuw bedrag: €209,30 per maand excl. btw, met je founding-korting. Je upgrade gaat meteen in.")).toBeVisible();
    await page.getByRole("button", { name: "Wissel naar Scale" }).click();
    await expect(toast(page, "Je zit nu op Scale.")).toBeVisible();
    await expect(fact("Plan")).toContainText("Scale · maandelijks");

    await page.getByRole("button", { name: "Overschakelen naar jaarlijks: 2 maanden gratis" }).click();
    await expect(toast(page, "Vanaf je volgende betaling betaal je jaarlijks.")).toBeVisible();
    await expect(page.getByText("Vanaf 16 december: jaarlijks")).toBeVisible();

    await page.getByRole("button", { name: "Ik wil opzeggen" }).click();
    await page.getByRole("radio", { name: "Te duur" }).check();
    await expect(page.getByText("Als je opzegt, verlies je je founding-korting van 30%.")).toBeVisible();
    await page.getByRole("button", { name: "Zeg mijn abonnement op" }).click();
    await expect(toast(page, "Je abonnement is opgezegd. Het loopt tot woensdag 16 december.")).toBeVisible();
    await expect(fact("Status")).toContainText("Opgezegd");
    await expect(fact("Volgende betaling")).toContainText("Geen");
    await page.getByRole("button", { name: "Ik wil toch blijven" }).click();
    await expect(toast(page, "Fijn dat je blijft. Je abonnement loopt gewoon door.")).toBeVisible();
    await expect(fact("Status")).toContainText("Proefperiode");
  });

  test("team: uitnodigen binnen de limiet van het plan", async ({ page }) => {
    await login(page, "tom", "/team");
    await resetDemo(page);
    await page.reload();
    await expect(page.getByText("1 van 1 gebruikers in Starter.")).toBeVisible();
    await expect(page.getByText("Dit zit in Pro.")).toBeVisible();
    await expect(page.getByLabel("Nodig iemand uit")).toHaveCount(0);

    await page.context().clearCookies();
    await login(page, "lisa", "/team");
    await expect(page.getByText("2 van 2 gebruikers in Pro.")).toBeVisible();
    await page.getByRole("button", { name: "Trek de uitnodiging voor teamlid@ateliernoor.voorbeeld in" }).click();
    await expect(toast(page, "De uitnodiging is ingetrokken.")).toBeVisible();
    await expect(page.getByText("1 van 2 gebruikers in Pro.")).toBeVisible();
    await page.getByLabel("Nodig iemand uit").fill("Nieuw@AtelierNoor.voorbeeld");
    await page.getByRole("combobox", { name: "Rol" }).selectOption("lezer");
    await page.getByRole("button", { name: "Stuur uitnodiging" }).click();
    await expect(toast(page, "Uitnodiging verstuurd naar nieuw@ateliernoor.voorbeeld.")).toBeVisible();
    const row = page.locator(".tm-user").filter({ hasText: "nieuw@ateliernoor.voorbeeld" });
    await expect(row).toContainText("Lezer");
    await expect(page.getByText("2 van 2 gebruikers in Pro.")).toBeVisible();
    await expect(page.getByText("Dit zit in Scale.")).toBeVisible();
  });

  test("academy: een les lezen, de controlevraag en een certificaat", async ({ page }) => {
    await login(page, "lisa", "/academy");
    await resetDemo(page);
    await page.reload();
    const basis = page.locator(".ac-track").filter({ hasText: "De basis" });
    await expect(basis).toContainText("2 van 5 lessen gelezen");
    await page.goto("/certificaat");
    await expect(page.getByText("Nog geen certificaat.", { exact: false })).toBeVisible();

    await page.goto("/academy/basis-1");
    await expect(page.getByRole("heading", { name: "Hoe Meta-advertenties werken" })).toBeVisible();
    await expect(
      page.getByText("Je hebt 1 campagne, 1 ad set en 5 advertenties. Je budget van €40 per dag staat op de campagne, zoals het playbook het wil."),
    ).toBeVisible();
    await page.getByRole("radio", { name: "Op elke ad set" }).click();
    await expect(page.getByText("Niet helemaal. Bij AdSweet staat je budget op de campagne.")).toBeVisible();
    await page.getByRole("radio", { name: "Op de campagne" }).click();
    await expect(page.getByText("Juist. Dan stuurt Meta het geld zelf naar wat het best loopt.")).toBeVisible();

    await page.goto("/academy/basis-3");
    for (const next of ["basis-4", "basis-5", "playbook-1"]) {
      await page.getByRole("button", { name: "Gelezen, naar de volgende les" }).click();
      await expect(page).toHaveURL(new RegExp(`/academy/${next}$`));
    }
    await page.goto("/academy");
    await expect(basis).toContainText("5 van 5 lessen gelezen");
    await page.goto("/certificaat");
    await expect(page.getByText("Lisa rondde traject 01 af: De basis.")).toBeVisible();
    await expect(page.getByText("5 lessen · maandag 7 december 2026")).toBeVisible();

    await page.goto("/begrippen");
    await page.getByLabel("Zoek een woord").fill("leerfase");
    await expect(page.locator(".bg-term dt")).toHaveText(["Leerfase"]);
    await page.getByLabel("Zoek een woord").fill("");
    await expect(page.locator(".bg-term").filter({ has: page.locator("dt", { hasText: /^ROAS$/ }) })).toContainText("In jouw cijfers:");
  });

  test("hulp: zoeken, een kwartaalcall aanvragen en de status van de koppelingen", async ({ page }) => {
    await login(page, "lisa", "/hulp");
    await resetDemo(page);
    await page.reload();
    await page.getByLabel("Waar kunnen we je mee helpen?").fill("credits");
    await expect(page.locator(".as-acc")).toHaveCount(1);
    await page.getByRole("button", { name: "Wat zijn credits?" }).click();
    await expect(page.getByText("Pro heeft er 300 per maand, Scale 600, Agency 1.500.", { exact: false })).toBeVisible();
    await page.getByLabel("Waar kunnen we je mee helpen?").fill("xyz");
    await expect(page.getByText("Niets gevonden voor ‘xyz’. Stel je vraag via Contact.")).toBeVisible();

    const call = page.locator(".hp-card").filter({ hasText: "Kwartaalcall" });
    await call.getByRole("button", { name: "Kies een moment" }).click();
    await expect(toast(page, "Aangevraagd. We mailen je om een moment te kiezen.")).toBeVisible();
    await expect(call).toContainText("Aangevraagd");
    await expect(page.locator(".hp-status__row").filter({ hasText: "Meta" })).toContainText("In orde");

    await page.context().clearCookies();
    await login(page, "tom", "/hulp");
    await expect(page.locator(".hp-card").filter({ hasText: "Kwartaalcall" }).getByRole("link", { name: "Bekijk de plannen" })).toBeVisible();
  });

  test("doorverwijzen: wie zich via je link aanmeldt, staat in je lijst", async ({ page }) => {
    await login(page, "lisa", "/doorverwijzen");
    await resetDemo(page);
    await page.reload();
    await expect(page.getByText("Nog niemand meldde zich aan via je link.")).toBeVisible();
    const link = await page.getByLabel("Je persoonlijke link").inputValue();
    expect(link).toMatch(/^adsweet\.ai\/r\/noor-[0-9a-f]{4}$/);
    await page.getByRole("button", { name: "Kopieer" }).click();
    await expect(toast(page, "De link is gekopieerd.")).toBeVisible();

    // Iemand nieuw opent de link en maakt een account
    await page.context().clearCookies();
    await page.goto(`/r/${link.split("/r/")[1]}`);
    await expect(page).toHaveURL(/\/account-maken$/);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Doorgaan met Facebook" }).click();
    await page.getByRole("button", { name: "Toegang gegeven", exact: true }).click();
    // Een nieuw account komt eerst op Vandaag (de onboarding volgt daar).
    await expect(page).toHaveURL(/\/vandaag$/);

    await page.context().clearCookies();
    await login(page, "lisa", "/doorverwijzen");
    const row = page.locator(".st-row").filter({ hasText: "Sarah" });
    await expect(row).toContainText("Aangemeld op maandag 7 december 2026");
    await expect(row).toContainText("Je gratis maand gaat in zodra deze klant betaalt");
  });
});
