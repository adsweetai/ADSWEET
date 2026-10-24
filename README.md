# AdSweet

Monorepo voor AdSweet: de app (app.adsweet.ai), het beheer en de mails. De website blijft een apart project.

## Snel starten

```bash
pnpm install
pnpm dev                                       # http://localhost:3000, in demomodus
pnpm dev:beheer                                # http://localhost:3001, Beheer (log in als team@adsweet.voorbeeld)
```

**Demomodus.** Zonder Supabase-sleutels draait de app op een Postgres in het proces (PGlite) met hetzelfde schema,
dezelfde rechten (RLS) en de voorbeelddata van Lisa, Tom, Sarah, Bram en Eva. Er gaan geen mails uit: na
"Stuur me een link" staat de link op de pagina "Check je mailbox". Bij elke herstart begint de data opnieuw.
In de demomodus heeft Beheer zijn eigen voorbeelddatabase: een versie die je daar publiceert, ziet de app pas met
Supabase, waar beide dezelfde database gebruiken.

**Met Supabase.**

```bash
cp apps/app/.env.example apps/app/.env.local   # vul de sleutels in, zie docs/koppelingen.md
pnpm dlx supabase start                        # lokale Supabase (Docker), leest supabase/config.toml
pnpm dlx supabase db reset                     # schema (supabase/migrations) + voorbeelddata (packages/db/seed.sql)
pnpm dev
```

De voorbeelddata komt uit `packages/db/src/fixtures`. Na een wijziging: `pnpm --filter @adsweet/db gen:seed`.

**Mails.** De 12 mails staan in `packages/mails`. Zonder `RESEND_API_KEY` gaan ze naar een postvak: in de demo zie je
ze op `/mails` (via het demopaneel), met een knop om alle 12 naar de testomgeving te sturen.

```bash
pnpm --filter @adsweet/mails send:test         # de 12 voorbeeldmails: met RESEND_API_KEY via Resend naar delivered@resend.dev, anders naar .mail-outbox/
pnpm --filter @adsweet/mails gen:supabase      # supabase/templates/magic_link.html uit hetzelfde sjabloon
```

De dagelijkse mails (proefperiode dag 27, Actie nodig, op maandag het weekrapport) draaien via
`GET /api/cron/dagelijks` met `Authorization: Bearer $CRON_SECRET`.

## Controleren

```bash
pnpm lint          # ESLint in alle pakketten
pnpm typecheck     # TypeScript
pnpm test          # Vitest (rekenregels, onderdelen)
pnpm build         # productiebuild
pnpm --filter app exec playwright install chromium   # eenmalig
pnpm test:e2e      # Playwright tegen de productiebuild (app op poort 3100, Beheer op 3101)
```

Gebruik `PW_CHANNEL=chrome` (of `msedge`) om de rooktest in een geïnstalleerde browser te draaien.

## Structuur

| Map | Wat |
|---|---|
| `apps/app` | Next.js 15 (App Router, TypeScript). De app, inloggen, onboarding, onboardingpaneel, Agency, Dot, rondleidingen. |
| `apps/beheer` | Next.js 15. Intern beheer, alleen voor `adsweet_admin`: playbook bewerken en publiceren, versies, strategieën, teksten, Academy, klanten, AI-kosten, kortingscodes, partners, calls, systeemstatus. |
| `packages/ui` | Designsysteem: tokens, letter, knoppen, badges, EuroTegel, actiekaart, Dot, lader. |
| `packages/db` | Supabase-schema, migraties, seed, gegenereerde types. |
| `packages/mails` | De 12 mails: één sjabloon (600px, tabellen, inline stijlen, licht), teksten in `nl.json`, verzending via Resend of een postvak. |
| `packages/playbook` | Het playbook als gegevens + de rekenregels (break-even, max. kost per verkoop, winnaar/verliezer). |
| `design/` | De HTML-prototypes. **Referentie, geen productiecode.** Open `design/Schermoverzicht.dc.html` in een browser. |
| `docs/` | Specificatie, schermen, koppelingen, de oorspronkelijke brief. |

## Werken met Claude Code

Lees eerst `CLAUDE.md`. Bouw in de volgorde van `docs/bouwplan.md`. Elke fase eindigt met een werkende, klikbare versie.
