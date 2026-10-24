# AdSweet

Monorepo voor AdSweet: de app (app.adsweet.ai), het beheer en de mails. De website blijft een apart project.

## Snel starten

```bash
pnpm install
cp apps/app/.env.example apps/app/.env.local   # vul de sleutels in, zie docs/koppelingen.md
pnpm supabase start                            # lokale database (Supabase CLI)
pnpm db:reset                                  # schema + voorbeelddata (Lisa, Tom, Sarah, Bram, Eva)
pnpm dev                                       # http://localhost:3000
```

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
