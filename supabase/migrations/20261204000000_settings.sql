-- Instellingen, abonnement en doorverwijzen (fase 10).

alter table public.organizations
  -- Een wijziging die pas bij de volgende betaling ingaat: { plan?, billing_period?, from }.
  add column scheduled_change jsonb,
  -- Waarom iemand opzegde (optioneel, uit de lijst bij Opzeggen).
  add column cancel_reason text,
  -- De code in de persoonlijke link adsweet.ai/r/[code].
  add column referral_code text unique,
  -- Verzoek om het account en de gegevens te verwijderen. AdSweet verwijdert binnen [termijn].
  add column deletion_requested_at timestamptz;

-- Wie zich via een doorverwijslink aanmeldt: de nieuwe organisatie, zodat de gratis maand kan ingaan zodra ze betaalt.
alter table public.referrals
  add column referred_organization_id uuid references public.organizations (id) on delete set null;
