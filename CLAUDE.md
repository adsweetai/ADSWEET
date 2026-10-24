# Instructies voor Claude Code · AdSweet

## Wat je bouwt
De volledige AdSweet-app in deze monorepo, pixel-getrouw volgens de HTML-prototypes in `design/`. Die prototypes zijn **ontwerpreferenties** (hifi): exacte kleuren, letter, maten, teksten en interacties. Bouw ze opnieuw in Next.js + TypeScript met de onderdelen uit `packages/ui`. Kopieer de HTML niet.

Lees in deze volgorde:
1. `docs/bouwplan.md` · de fases en wat "klaar" betekent per fase
2. `docs/schermen.md` · elk scherm, de route, het prototype en de staten
3. `docs/designsysteem.md` · tokens, letter, onderdelen, beweging
4. `docs/regels.md` · playbook, plannen en rechten, rekenregels, copyregels
5. `docs/datamodel.md` · Supabase-tabellen en RLS
6. `docs/koppelingen.md` · Meta, betalingen, Claude, mail
7. `docs/brief-volledige-app.txt` · de oorspronkelijke brief. Bij twijfel wint deze, behalve waar docs/regels.md expliciet afwijkt.

## Harde regels
- **Taal:** alleen Nederlands in deze versie. Zet alle teksten toch in `apps/app/messages/nl.json` (next-intl), zodat FR en EN later kunnen.
- **Styling:** CSS-variabelen uit `packages/ui/src/tokens.css`. Geen hardgecodeerde kleuren in componenten. Licht en nacht via `data-theme` op `<html>`, standaard volgt het toestel.
- **Robijn** (`--robijn`) is het raakpunt: hoogstens één punt per scherm (Dot, focusring en logo tellen niet mee). Waarschuwingen gebruiken `--act`, nooit robijn.
- **AdSweet zet nooit zelf een advertentie af.** Ook de autopilot niet. Alleen voorstellen met een knop.
- **Lopende ad sets worden niet gewijzigd.** Nieuwe advertenties komen in een nieuwe ad set.
- **Starter heeft geen AI:** geen Studio, geen Concurrenten, geen Dot-assistent, geen AI-knoppen. Gate op de server, niet alleen in de UI.
- **Toegankelijkheid:** focusring 2px robijn met 4px afstand, `prefers-reduced-motion` respecteren, aria-labels zoals in de prototypes.
- **Geheimen** alleen server-side (Route Handlers / Server Actions). Nooit `NEXT_PUBLIC_` voor Meta-, Claude- of betaalsleutels.
- **Plaatshouders** tussen [vierkante haken] uit de prototypes blijven plaatshouders tot PJ ze invult. Verzin geen cijfers.

## Werkwijze
- Eén fase per pull request. Begin elke PR met een korte lijst van wat er gebouwd is en wat nog plaatshouder is.
- Schrijf voor de rekenregels in `packages/playbook` unit tests (Vitest) met de voorbeelden van Lisa en Tom uit docs/regels.md.
- Gebruik Playwright voor één rooktest per fase (inloggen → Vandaag → een actiekaart afhandelen).
