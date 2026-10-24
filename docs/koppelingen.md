# Koppelingen: wat je nodig hebt

## 1. Supabase (login, database, opslag)
- Project aanmaken op supabase.com (regio Frankfurt, EU-data).
- Auth: e-mail magic link aan; Facebook als OAuth-provider (zie Meta).
- Storage-buckets: `documents`, `media`, `brand` (privé, RLS).
- Vault voor tokens van Meta en Google.
- Sleutels: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (alleen server).

## 2. Meta (Facebook en Instagram)
- **Meta Business Manager** voor AdSweet zelf + **Meta for Developers**-app, type *Business*.
- Producten: *Facebook Login for Business*, *Marketing API*.
- Rechten (aan te vragen via **App Review**, met screencast en privacybeleid): `ads_management`, `ads_read`, `business_management`, `pages_show_list`, `pages_read_engagement`, `instagram_basic`, `read_insights`.
- **Business-verificatie** van je bedrijf (ondernemingsnummer, adres) en **Advanced Access** voor de Marketing API.
- **Data Deletion Callback URL** (pagina "Je gegevens verwijderen") en privacybeleid-URL zijn verplicht.
- System user + long-lived tokens per klant; vernieuwen en "koppeling verlopen" detecteren.
- Webhooks: `ad_account` (afgekeurde advertenties, betaalproblemen).
- Gebruik de officiële "Doorgaan met Facebook"-knop van Meta.
- Sleutels: `META_APP_ID`, `META_APP_SECRET`, `META_API_VERSION` (bv. v23.0), `META_WEBHOOK_VERIFY_TOKEN`.
- Doorlooptijd: reken op 2 tot 6 weken voor App Review + verificatie. Start hier als eerste.

## 3. Claude voor Dot en Studio
- Account op **console.anthropic.com**, API-sleutel, facturatie aan, spend limits instellen.
- Model: Claude (Sonnet voor Dot en de audit-uitleg; Haiku voor goedkope taken zoals teksten en hooks). Kies de actuele modelnamen in de console.
- Server-route `/api/dot` met **tool use**: tools `get_insights`, `get_ads`, `propose_change` (schrijft een *pending change*, voert niets uit), `draft_campaign`. Dot voert nooit iets uit zonder klik.
- Systeemprompt: playbook-versie + bedrijfsprofiel + doelen + cijfers van de laatste 30 dagen. Streaming naar het paneel.
- Elke aanroep in `credits_ledger` (tokens → kost in euro) voor Beheer → AI-kosten.
- Beelden in Studio: Claude maakt geen beelden. Kies een beeldmodel (bv. via een aparte API) en zet dat in `STUDIO_IMAGE_PROVIDER`.
- Sleutel: `ANTHROPIC_API_KEY`.
- Contract: verwerkersovereenkomst/DPA van Anthropic, en vermelden als subverwerker.

## 4. Betalingen
- **Stripe** (Billing + Checkout + Customer Portal + Stripe Tax, Bancontact) of **Mollie** (Belgisch, Bancontact). Voorstel: Stripe voor abonnementen met proefperiode en jaarplan.
- Producten: Starter, Pro, Scale, Agency (staffel), maandelijks + jaarlijks; coupon founding −30%.
- Webhooks: `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated/deleted`.
- Btw: Stripe Tax, btw-nummer valideren (VIES), verlegging.
- Peppol: via je boekhoudpakket of een Peppol-access point (bv. via Billit, Exact, Teamleader).
- Sleutels: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

## 5. Mail
- **Resend** (of Postmark). Domein adsweet.ai verifiëren (SPF, DKIM, DMARC). Afzender hallo@adsweet.ai.
- Supabase Auth-mails ook via Resend (SMTP).
- Sleutel: `RESEND_API_KEY`.

## 6. Nachtelijke audit en meldingen
- Supabase Cron (pg_cron) of Vercel Cron, 06:00 Europe/Brussels: insights ophalen → regels uit `packages/playbook` → `recommendations` + `notifications` + mail.
- Weekrapport maandag 07:00.

## 7. Later
Google Ads API (developer token + OAuth), Google Analytics, Google Drive/Dropbox/Canva/Figma pickers, Slack.

## 8. Hosting
- **Vercel**: twee projecten uit deze repo (`apps/app` → app.adsweet.ai, `apps/beheer` → beheer.adsweet.ai, achter IP-allowlist of SSO).
- DNS bij je registrar: CNAME app → Vercel.
- Monitoring: Sentry. Analytics: alleen na cookie-toestemming.

## Checklist om nu te starten
1. Supabase-project · 2. Meta Business + Developer-app, App Review aanvragen · 3. Anthropic-console · 4. Stripe-account met Bancontact · 5. Resend + DNS · 6. Vercel gekoppeld aan adsweetai/ADSWEET.
