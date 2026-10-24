# AdSweet

Monorepo voor AdSweet: de app (app.adsweet.ai), het beheer en de mails. De website blijft een apart project.

## Snel starten

```bash
pnpm install
pnpm dev                                       # http://localhost:3000, in demomodus
```

**Demomodus.** Zonder Supabase-sleutels draait de app op een Postgres in het proces (PGlite) met hetzelfde schema,
dezelfde rechten (RLS) en de voorbeelddata van Lisa, Tom, Sarah, Bram en Eva. Er gaan geen mails uit: na
"Stuur me een link" staat de link op de pagina "Check je mailbox". Bij elke herstart begint de data opnieuw.

**Met Supabase.**

```bash
cp apps/app/.env.example apps/app/.env.local   # vul de sleutels in, zie docs/koppelingen.md
pnpm dlx supabase start                        # lokale Supabase (Docker), leest supabase/config.toml
pnpm dlx supabase db reset                     # schema (supabase/migrations) + voorbeelddata (packages/db/seed.sql)
pnpm dev
```

De voorbeelddata komt uit `packages/db/src/fixtures`. Na een wijziging: `pnpm --filter @adsweet/db gen:seed`.

## Controleren

```bash
pnpm lint          # ESLint in alle pakketten
pnpm typecheck     # TypeScript
pnpm test          # Vitest (rekenregels, onderdelen)
pnpm build         # productiebuild
pnpm --filter app exec playwright install chromium   # eenmalig
pnpm test:e2e      # Playwright-rooktest tegen de productiebuild (poort 3100)
```

Gebruik `PW_CHANNEL=chrome` (of `msedge`) om de rooktest in een geïnstalleerde browser te draaien.

## Structuur

| Map | Wat |
|---|---|
| `apps/app` | Next.js 15 (App Router, TypeScript). De app, inloggen, onboarding, onboardingpaneel, Agency, Dot, rondleidingen. |
| `apps/beheer` | Next.js 15. Intern beheer voor het AdSweet-team (playbook, versies, klanten, AI-kosten, …). |
| `packages/ui` | Designsysteem: tokens, letter, knoppen, badges, EuroTegel, actiekaart, Dot, lader. |
| `packages/db` | Supabase-schema, migraties, seed, gegenereerde types. |
| `packages/mails` | De 12 mails als gewone HTML-sjablonen. |
| `packages/playbook` | Het playbook als gegevens + de rekenregels (break-even, max. kost per verkoop, winnaar/verliezer). |
| `design/` | De HTML-prototypes. **Referentie, geen productiecode.** Open `design/Schermoverzicht.dc.html` in een browser. |
| `docs/` | Specificatie, schermen, koppelingen, de oorspronkelijke brief. |

## Werken met Claude Code

Lees eerst `CLAUDE.md`. Bouw in de volgorde van `docs/bouwplan.md`. Elke fase eindigt met een werkende, klikbare versie.
