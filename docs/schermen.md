# Schermen

Prototype = bestand in `design/` + de hash-route daarin. Label = MVP / V1 / Later.

## Inloggen en onboarding · `apps/app/app/(auth)`
| Route | Prototype | Label |
|---|---|---|
| /inloggen | Inloggen.dc.html#inloggen | MVP |
| /account-maken | #account-maken (knop pas actief na akkoord voorwaarden) | MVP |
| /mail-verstuurd | #mail-verstuurd | MVP |
| /testfase | #testfase (aan als `TESTFASE=true`) | MVP |
| /uitnodiging/[token] | #uitnodiging | V1 |
| /onboarding/[stap] (1–11) | #onboarding-1 … #onboarding-11 · varianten Sarah, Webshop, Al campagnes (stap 7 alleen bij bestaande campagnes) | MVP |
| /afstemmen/[stap] (1–8) | Onboardingpaneel.dc.html · website, brandguide, documenten, beelden, aanbod, toon, doelen, klaar | MVP |

Foutstaten van het Meta-venster: geen toestemming, geen advertentieaccount, koppeling verlopen.

## App · `apps/app/app/(app)`
| Route | Prototype (App.dc.html#…) | Label |
|---|---|---|
| /vandaag | #vandaag · varianten normaal, dag 1, zonder verkoopdoel, geen acties; Bram: alle accounts | MVP |
| /klanten | #klanten (Agency) + modaal Nieuwe klant toevoegen | MVP |
| /meldingen | #meldingen | MVP |
| /logboek | #logboek | V1 |
| /campagnes | #campagnes (+ lege staat) | MVP |
| /campagnes/[id] | #campagne · tabs Overzicht, Advertenties, Instellingen, Logboek | MVP |
| /campagnes/nieuw | #campagne-nieuw · 9 stappen, waarschuwingen, samenvatting, Laat Dot dit voorstellen | MVP |
| /advertenties/toevoegen | #advertenties-toevoegen | MVP |
| /advertenties/maken | #advertentie-maken · 8 delen | MVP |
| /bulk | #bulk | MVP |
| /advertenties | #advertenties · tabs Advertenties, Beelden, Organische posts | MVP |
| /testgrid | #testgrid | V1 |
| /google | #google ([Google-playbook PJ]) | V1 |
| /catalogus | #catalogus | Later |
| /p/[code] | #preview-link (publiek, zonder account) | V1 |
| /studio | #studio (vanaf Pro) | MVP |
| /concurrenten | #concurrenten (vanaf Pro) | V1 |
| /inzichten | #inzichten · tabs Overzicht (uitgebreid), Advertenties, Doelgroepen, Benchmarks, Rapporten · geen Shopify | MVP |
| /weekrapport/[week] | #weekrapport | MVP |
| /autopilot | #autopilot | V1 |
| /academy, /academy/[les], /begrippen, /certificaat | #academy #les #begrippen #certificaat | MVP/V1 |
| /hulp | #hulp · blok Geef mij opnieuw uitleg | MVP |
| /instellingen/[sub] | #instellingen-profiel … -ontwikkelaars (14) | MVP |
| /abonnement | #abonnement · staten proef, actief, mislukt, opgezegd, verlopen | MVP |
| /team | #team | V1 |
| /doorverwijzen | #doorverwijzen | MVP |
| /partner | #partnerportaal | Later |

Overlays: advertentiepaneel (rechts), Dot-paneel (rechts, 420px; gsm volledig scherm), Pro-slot, toast, demopaneel (alleen `NODE_ENV!=production`).

## Beheer · `apps/beheer`
Beheer.dc.html: Playbook, Versies, Strategieën, Teksten en vertalingen, Academy, Klanten, AI-kosten, Kortingscodes, Partners, Calls, Systeemstatus.

## Mails · `packages/mails`
Mails.dc.html: Welkom, Link om in te loggen, Uitnodiging teamlid, Proefperiode bijna om (dag 27), Proefperiode omgezet, Factuur, Betaling mislukt, Weekrapport, Melding Actie nodig, Kwartaalcall bevestigd, Doorverwijzing gelukt, Opgezegd. Max 600px breed, tabellen voor layout, inline stijlen, lichte versie (mailclients).
