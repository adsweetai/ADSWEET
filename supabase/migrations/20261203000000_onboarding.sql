-- Onboarding (11 stappen) en het onboardingpaneel "Stem AdSweet af op je zaak" (8 stappen).

-- Wat de klant vertelt over zijn aanbod en zijn toon, en wat AdSweet op de website vond.
alter table public.business_profiles
  add column bestsellers text,
  add column moments text[] not null default '{}',
  add column say_yes text,
  add column say_no text,
  add column found jsonb not null default '{}'::jsonb;

-- Voortgang van het onboardingpaneel: welke stappen klaar of overgeslagen zijn. tuning_step blijft de stap waar je bent.
alter table public.organizations
  add column tuning jsonb not null default '{}'::jsonb;

-- Een nieuwe klant maakt zijn eigen organisatie aan bij de eerste stap van de onboarding (via de server, met de
-- service role). Een uitnodiging lezen en aanvaarden gebeurt ook op de server, op basis van het token.
