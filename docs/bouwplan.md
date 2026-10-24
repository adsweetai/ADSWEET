# Bouwplan

Eerst alles visueel en klikbaar op Supabase met voorbeelddata. Daarna de echte koppelingen.

| Fase | Wat | Klaar als |
|---|---|---|
| 0 | Monorepo, pnpm workspaces, Turborepo, ESLint, Prettier, Vitest, Playwright. `packages/ui` met tokens + Host Grotesk. | `pnpm dev` toont een lege pagina in de juiste letter en kleuren, licht en nacht. |
| 1 | Supabase: schema, RLS, seed met Lisa, Tom, Sarah, Bram (3 accounts) en Eva (Agency, 6 klanten). Supabase Auth met magic link. | Inloggen met e-mail werkt, je ziet je eigen organisatie. |
| 2 | Designsysteem in `packages/ui`: alle onderdelen uit `design/Componentenoverzicht.dc.html`. Storybook optioneel. | Een pagina `/_onderdelen` toont alles in licht en nacht. |
| 3 | App-shell: zijbalk, bovenbalk, tabbalk op gsm, accountkiezer, meldingen, periodekiezer, proefperiodebalk, banners, toast met Ongedaan maken, Pro-slot. | Navigeren door alle routes, ook lege. |
| 4 | Vandaag (alle varianten), Meldingen, Logboek, Weekrapport. | Lisa en Tom zien hun eigen Vandaag; Zet hem af schrijft naar het logboek. |
| 5 | Campagnes, campagnedetail, wizard (9 stappen), advertenties toevoegen, advertentie maken, bulk, bibliotheek, testgrid, preview-link, advertentiepaneel. | Een campagne doorloopt de wizard en verschijnt in de lijst (nog niet naar Meta). |
| 6 | Inloggen, account maken, testfase, uitnodiging, onboarding 11 stappen, onboardingpaneel 8 stappen (uploads naar Supabase Storage). | Een nieuwe gebruiker komt van account maken tot Vandaag. |
| 7 | Studio, Concurrenten, Inzichten (uitgebreid), Autopilot en regels. Plangating. | Starter ziet geen AI; Pro wel. |
| 8 | Dot: karakter, paneel, rondleidingen (3), vakwoord-uitleg, Dot vult de wizard in. Eerst met vaste antwoorden. | Rondleiding start de eerste keer vanzelf, kan opnieuw via Hulp. |
| 9 | Agency: klantenoverzicht, klant openen, nieuwe klant toevoegen, rechten per klant. | Eva wisselt tussen 6 klanten. |
| 10 | Academy, Hulp, Instellingen (alle 14), Abonnement, Team, Doorverwijzen. | Alle instellingen bewaren in Supabase. |
| 11 | Beheer-app (`apps/beheer`), alleen voor rol `adsweet_admin`. | Playbook bewerken + publiceren als nieuwe versie. |
| 12 | Mails in `packages/mails` + verzending (Resend). | De 12 mails verzonden in een testomgeving. |
| 13 | Koppelingen echt maken: Meta, betalingen, Claude voor Dot en Studio, nachtelijke audit. Zie koppelingen.md. | Lisa's echte cijfers uit Meta op Vandaag. |
