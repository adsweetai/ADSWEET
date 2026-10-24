# Designsysteem

Bron: `packages/ui/src/tokens.source.css` (origineel) en `design/Componentenoverzicht.dc.html`.

## Kleuren
| Token | Licht | Nacht | Gebruik |
|---|---|---|---|
| --ground | #EAE8E3 | #111110 | achtergrond |
| --surface | #F5F4F0 | #1A1A19 | kaarten, panelen, zijbalk |
| --surface-sunken | #E2E0DA | #0C0C0B | velden, tabelkoppen |
| --ink | #151514 | #F1EFEA | tekst, primaire knop |
| --ink-muted | #5F5C56 | #A8A49B | uitleg |
| --ink-accent | #7A776F | #9B978E | accent in titels ≥32px |
| --line | #15151424 | #F1EFEA24 | haarlijnen |
| --line-strong | #7A776F | #6E6B65 | velden, tweede knop |
| --robijn | #C7254E | #E0577A | raakpunt, focusring, Dot, "sweet" |
| --ok / --ok-tint | #2E6B45 / #DCEADF | #86C79A / #1B2A20 | In orde, Winnaar |
| --warn / --warn-tint | #8A5410 / #F2E2C4 | #E2B062 / #2D2414 | Let op |
| --act / --act-tint | #AE3A1F / #F5DCD3 | #F0937A / #341C16 | Actie nodig, Verliezer, waarschuwing |
Reeks (tekst erop altijd #151514): tarwe #E8D7AE, staal #B8C7D9 (top), lavendel #CEC4EA, salie #BFD9C6 (middle), klei #E9C2AE (bottom), roos #EEC1D0.
Snoep-accenten: roos #F28AB2, citroen #F5CF5C, munt #7FD3B0, bes #A99BF2, hemel #8FC2F2, perzik #F7A97A. Gebruik: bolletjes bij kopjes, stapnummers, gekleurde blokken, confetti. Nooit voor tekst.

## Letter
Host Grotesk 300/400/500/600 (`public/fonts`, OFL). `letter-spacing:-.01em`, `font-variant-numeric:tabular-nums`.
Hero clamp(40,6.6vw,112)/500/.92/-.045em · Sectietitel clamp(32,4vw,64)/500 · Begroeting 32–36 · Paginatitel app 28–32 · Kaarttitel 18–22/500 · App-tekst 15/1.5 · Eyebrow 12, hoofdletters, .12em.

## Vormen
Radius: velden 10, kaarten 16, blokken 18–24, pillen 999. Knop primair 40px (app) / 46px (web). Schaduw zwevend: `0 12px 32px rgba(21,21,20,.12), 0 2px 6px rgba(21,21,20,.06)`. Geen verlopen, geen glas.

## Beweging
Overgangen 300ms `cubic-bezier(.2,.7,.2,1)`. Binnenkomen 12px omhoog, 600ms, 60ms na elkaar. Getallen tellen op in 600ms. Lader: drie lijnen naar één robijn punt, 1,2s, altijd met een zin. Sweetmoment: punt pulseert één keer + confetti. Alles uit bij reduced-motion.

## Dot
Het robijn puntje uit het logo met oogjes, wangetjes en glans. Referentie: `design/dot.js` (web component `<dot-karakter mood size>`) en `design/Dot.dc.html` (intro-animatie: puntje springt uit het logo en terug). Stemmingen: rust, praat, denkt, blij, knipoog, viert. Bouw als React-component in `packages/ui/dot`. Naam in één constante `ASSISTANT_NAME = "Dot"`.

## Rondleidingen en vakwoorden
Referentie `design/rondleiding.js`: spotlight (donkere overlay, gat rond het doel), kaartje met Dot, stap x van n, Vorige/Volgende/Sla over, pijltjes en Esc. Drie tours: app (12), campagne (7), wizard (6). Doelen via `data-tour`. Gezien-status per gebruiker in Supabase (`user_tours`), niet in localStorage.
Vakwoorden: ±30 begrippen, stippellijn via CSS Custom Highlight API, uitleg + "In jouw cijfers" met de cijfers van de ingelogde zaak. Bouw als `<Term id="roas">ROAS</Term>` waar je de tekst zelf schrijft, en een automatische scanner als fallback.
Dot vult de wizard in: `design/dotvul.js`.
