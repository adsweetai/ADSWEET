-- AdSweet · een nieuw Supabase-project klaarzetten. Gegenereerd door `pnpm --filter @adsweet/db gen:setup`.
-- Plak dit in Supabase › SQL Editor en klik op Run. Eén keer, op een leeg project.
-- Niet met de hand aanpassen: wijzig supabase/migrations en genereer opnieuw.

-- ===== 20261201000000_schema.sql =====

-- AdSweet · schema, rechten (RLS) en opslag.
-- Elke rij hangt aan een organisatie. Leden zien hun eigen organisatie; Agency-leden zien de klanten
-- van hun bureau (agency_parent_id), beperkt tot de advertentieaccounts waarop ze recht hebben.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Organisaties, gebruikers en leden
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'webshop' check (kind in ('webshop', 'dienstverlener', 'lokaal', 'zelfstandige', 'bureau')),
  plan text not null default 'pro' check (plan in ('starter', 'pro', 'scale', 'agency')),
  billing_period text not null default 'maandelijks' check (billing_period in ('maandelijks', 'jaarlijks')),
  subscription_status text not null default 'proef' check (subscription_status in ('proef', 'actief', 'mislukt', 'opgezegd', 'verlopen')),
  trial_started_at date,
  trial_ends_at date,
  cancel_at date,
  founding boolean not null default false,
  discount_code text,
  agency_parent_id uuid references public.organizations (id) on delete cascade,
  agency_owner_user_id uuid,
  color text not null default 'roos' check (color in ('tarwe', 'staal', 'lavendel', 'salie', 'klei', 'roos')),
  billing_name text,
  billing_vat text,
  billing_address text,
  billing_email text,
  onboarding_step int not null default 1,
  onboarding_done boolean not null default false,
  tuning_step int not null default 1,
  naming jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index organizations_agency_parent_idx on public.organizations (agency_parent_id);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  first_name text,
  full_name text,
  locale text not null default 'nl' check (locale in ('nl', 'fr', 'en')),
  theme text not null default 'auto' check (theme in ('auto', 'light', 'dark')),
  timezone text not null default 'Europe/Brussels',
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.adsweet_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null default 'eigenaar' check (role in ('eigenaar', 'beheerder', 'lezer')),
  -- Alleen voor Agency: de advertentieaccounts van klanten waarop dit lid recht heeft. null = alle.
  ad_account_ids uuid[],
  created_at timestamptz not null default now(),
  unique (user_id, organization_id)
);
create index members_org_idx on public.members (organization_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  email text not null,
  role text not null default 'beheerder' check (role in ('eigenaar', 'beheerder', 'lezer')),
  ad_account_ids uuid[],
  token text not null unique default encode(gen_random_bytes(18), 'hex'),
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Advertentieaccounts, profiel, doelen, documenten, beelden, koppelingen
-- ---------------------------------------------------------------------------

create table public.ad_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  meta_ad_account_id text,
  currency text not null default 'EUR',
  timezone text not null default 'Europe/Brussels',
  status text not null default 'actief' check (status in ('actief', 'betaalprobleem', 'koppeling_verlopen', 'uitgeschakeld')),
  payment_method_ok boolean not null default true,
  channel text not null default 'meta' check (channel in ('meta', 'google')),
  sort int not null default 0,
  created_at timestamptz not null default now()
);
create index ad_accounts_org_idx on public.ad_accounts (organization_id);

create table public.business_profiles (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  website text,
  sells text,
  offers jsonb not null default '[]'::jsonb,
  audience text,
  tone text[] not null default '{}',
  tone_example text,
  region text,
  colors text[] not null default '{}',
  font text,
  logo_path text,
  never_say text,
  differentiator text,
  best_customers text,
  competitors text[] not null default '{}',
  contact jsonb not null default '{}'::jsonb,
  payer text,
  beneficiary text,
  updated_at timestamptz not null default now()
);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ad_account_id uuid references public.ad_accounts (id) on delete cascade,
  type text not null check (type in ('verkopen', 'aanvragen', 'zaak', 'anders')),
  zaak_mode text check (zaak_mode in ('aanvragen', 'bekendheid')),
  aov numeric(12, 2),
  margin numeric(5, 4),
  target_roas numeric(6, 2),
  target_cpl numeric(12, 2),
  clv numeric(12, 2),
  close_rate numeric(5, 4),
  targeting jsonb not null default '{}'::jsonb,
  special_category boolean not null default false,
  updated_at timestamptz not null default now()
);
create unique index goals_org_account_idx on public.goals (organization_id, coalesce(ad_account_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  category text not null check (category in ('prijs', 'reviews', 'resultaten', 'anders', 'brandguide')),
  name text not null,
  storage_path text not null,
  status text not null default 'nieuw' check (status in ('nieuw', 'gelezen', 'fout')),
  extracted jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.media (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  name text,
  storage_path text,
  kind text not null check (kind in ('foto', 'video')),
  source text not null default 'upload' check (source in ('website', 'upload', 'drive', 'dropbox', 'canva', 'figma', 'studio')),
  width int,
  height int,
  duration_s numeric(6, 1),
  used_in uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ad_account_id uuid references public.ad_accounts (id) on delete cascade,
  provider text not null check (provider in ('meta', 'google_ads', 'shopify', 'google_analytics', 'google_drive', 'dropbox', 'canva', 'figma', 'slack')),
  status text not null default 'gekoppeld' check (status in ('gekoppeld', 'verlopen', 'los', 'fout')),
  connected_at timestamptz,
  expires_at timestamptz,
  -- Het token zelf staat in Supabase Vault; hier alleen de verwijzing.
  vault_secret_id uuid,
  meta_ad_account_id text,
  page_id text,
  page_name text,
  ig_id text,
  ig_name text,
  pixel_id text,
  pixel_name text,
  pixel_ok boolean,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index connections_org_idx on public.connections (organization_id);

-- ---------------------------------------------------------------------------
-- Campagnes, ad sets, advertenties en cijfers
-- ---------------------------------------------------------------------------

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ad_account_id uuid references public.ad_accounts (id) on delete set null,
  meta_id text,
  name text not null,
  kind text not null default 'vast' check (kind in ('vast', 'solden', 'bf', 'feest', 'event', 'nieuw', 'catalogus')),
  goal text not null default 'verkopen' check (goal in ('verkopen', 'aanvragen', 'volgers', 'bereik', 'evenement')),
  channel text not null default 'meta' check (channel in ('meta', 'google')),
  status text not null default 'concept' check (status in ('concept', 'actief', 'leerfase', 'gepland', 'gepauzeerd', 'afgelopen')),
  daily_budget numeric(12, 2),
  budget_level text not null default 'campagne' check (budget_level in ('campagne', 'adset')),
  start_date date,
  end_date date,
  outside_adsweet boolean not null default false,
  deviations text[] not null default '{}',
  targeting jsonb not null default '{}'::jsonb,
  placements text not null default 'automatisch',
  extras_off boolean not null default true,
  payer text,
  beneficiary text,
  utm jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users (id) on delete set null,
  launched_at timestamptz,
  created_at timestamptz not null default now()
);
create index campaigns_org_idx on public.campaigns (organization_id);

create table public.ad_sets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  meta_id text,
  name text not null,
  reason text,
  start_date date,
  learning boolean not null default false,
  -- Lopende ad sets raken we niet aan.
  locked boolean not null default false,
  daily_budget numeric(12, 2),
  status text not null default 'actief' check (status in ('concept', 'actief', 'gepauzeerd', 'afgelopen')),
  created_at timestamptz not null default now()
);
create index ad_sets_campaign_idx on public.ad_sets (campaign_id);

create table public.ads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  ad_set_id uuid not null references public.ad_sets (id) on delete cascade,
  media_id uuid references public.media (id) on delete set null,
  meta_id text,
  code text not null,
  name text not null,
  kind text not null check (kind in ('foto', 'video')),
  phase text not null check (phase in ('top', 'middle', 'bottom')),
  primary_text text,
  headline text,
  description text,
  cta text,
  -- Varianten die AdSweet voorstelde: {"primary_text": [...], "headline": [...], "description": [...]}
  variants jsonb not null default '{}'::jsonb,
  extras jsonb not null default '{"muziek": false, "tekst_op_beeld": false, "beelduitbreiding": false, "varianten": false}'::jsonb,
  label text check (label in ('winnaar', 'geen', 'verliezer', 'vroeg', 'rapport')),
  status text not null default 'actief' check (status in ('concept', 'in_review', 'actief', 'uit', 'afgekeurd')),
  review_status text not null default 'goedgekeurd' check (review_status in ('goedgekeurd', 'wordt_nagekeken', 'afgekeurd')),
  started_at date,
  created_at timestamptz not null default now()
);
create index ads_campaign_idx on public.ads (campaign_id);
create index ads_org_idx on public.ads (organization_id);

-- Cijfers per dag. ad_id is leeg voor campagnes waarvan we alleen het totaal kennen.
-- Lege waarden betekenen: niet gemeten.
create table public.insights_daily (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  ad_id uuid references public.ads (id) on delete cascade,
  date date not null,
  spend numeric(12, 2) not null default 0,
  impressions int,
  reach int,
  clicks int,
  link_clicks int,
  lpv int,
  view_content int,
  add_to_cart int,
  checkout int,
  purchases int,
  revenue numeric(12, 2),
  leads int,
  followers int,
  video_3s int,
  video_thruplay int
);
create unique index insights_daily_ad_date_idx on public.insights_daily (coalesce(ad_id, campaign_id), date);
create index insights_daily_org_date_idx on public.insights_daily (organization_id, date);

-- ---------------------------------------------------------------------------
-- Audit, voorstellen, logboek, meldingen
-- ---------------------------------------------------------------------------

create table public.playbook_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  status text not null default 'concept' check (status in ('concept', 'gepubliceerd', 'gearchiveerd')),
  rules jsonb not null,
  note text,
  created_by uuid references auth.users (id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ran_at timestamptz not null,
  score int,
  playbook_version text,
  summary jsonb not null default '{}'::jsonb
);
create index audit_runs_org_idx on public.audit_runs (organization_id, ran_at desc);

create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  audit_run_id uuid references public.audit_runs (id) on delete set null,
  ad_account_id uuid references public.ad_accounts (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete cascade,
  ad_id uuid references public.ads (id) on delete cascade,
  parent_id uuid references public.recommendations (id) on delete cascade,
  type text not null,
  severity text not null default 'info' check (severity in ('act', 'warn', 'info')),
  payload jsonb not null default '{}'::jsonb,
  sort int not null default 0,
  status text not null default 'open' check (status in ('wacht', 'open', 'gedaan', 'later', 'zo-laten')),
  snoozed_until date,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index recommendations_org_idx on public.recommendations (organization_id, status);

create table public.log_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  at timestamptz not null default now(),
  -- false als alleen de dag gekend is; de app toont dan [tijd].
  time_known boolean not null default true,
  actor text not null check (actor in ('user', 'autopilot', 'outside', 'adsweet', 'assistant')),
  actor_name text,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null default 'wijziging' check (kind in ('wijziging', 'budget', 'advertentie', 'extra', 'campagne', 'audit')),
  what text not null,
  from_to text,
  undo jsonb,
  undone_at timestamptz
);
create index log_entries_org_idx on public.log_entries (organization_id, at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  type text not null,
  severity text not null default 'warn' check (severity in ('act', 'warn', 'ok')),
  payload jsonb not null default '{}'::jsonb,
  href text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  emailed_at timestamptz
);
create index notifications_org_idx on public.notifications (organization_id, created_at desc);

create table public.notification_settings (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  in_app boolean not null default true,
  email boolean not null default true,
  primary key (organization_id, user_id, type)
);

-- ---------------------------------------------------------------------------
-- Autopilot, regels, assistent, credits, rondleidingen
-- ---------------------------------------------------------------------------

create table public.autopilot_settings (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  mode text not null default 'vraag' check (mode in ('uit', 'vraag', 'grenzen')),
  limits jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  metric text not null,
  comparator text not null,
  value numeric(12, 2),
  "window" text not null,
  action text not null check (action in ('melding', 'budget', 'starten', 'stoppen', 'voorstel_afzetten')),
  action_value text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.assistant_threads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  created_at timestamptz not null default now()
);

create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.assistant_threads (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null default '',
  tool_calls jsonb,
  pending_change jsonb,
  created_at timestamptz not null default now()
);

create table public.credits_ledger (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  delta int not null,
  reason text not null,
  model text,
  cost_eur numeric(10, 4),
  created_at timestamptz not null default now()
);
create index credits_ledger_org_idx on public.credits_ledger (organization_id, created_at);

create table public.user_tours (
  user_id uuid not null references auth.users (id) on delete cascade,
  tour text not null check (tour in ('app', 'campagne', 'wizard')),
  seen_at timestamptz not null default now(),
  primary key (user_id, tour)
);

create table public.academy_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  lesson text not null,
  done_at timestamptz not null default now(),
  primary key (user_id, lesson)
);

-- ---------------------------------------------------------------------------
-- Abonnement, kortingen, doorverwijzen, partners, calls
-- ---------------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  number text not null,
  issued_at date not null,
  amount_excl numeric(12, 2) not null,
  vat numeric(12, 2) not null,
  status text not null default 'open' check (status in ('open', 'betaald', 'mislukt')),
  pdf_path text,
  created_at timestamptz not null default now()
);

create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('founding', 'doorverwijzing', 'partner')),
  percent_off int,
  months_free int,
  max_uses int,
  uses int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  code text not null,
  referred_name text,
  signed_up_at date,
  free_month_from date,
  created_at timestamptz not null default now()
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  company text,
  email text not null,
  website text,
  what text,
  status text not null default 'aanmelding' check (status in ('aanmelding', 'actief', 'gestopt')),
  code text unique,
  created_at timestamptz not null default now()
);

create table public.calls (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  kind text not null check (kind in ('onboarding', 'kwartaal')),
  starts_at timestamptz,
  status text not null default 'te_plannen' check (status in ('te_plannen', 'gepland', 'gedaan')),
  created_at timestamptz not null default now()
);

create table public.waitlist (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  website text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Rechten
-- ---------------------------------------------------------------------------

create or replace function public.is_adsweet_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from adsweet_admins a where a.user_id = auth.uid());
$$;

-- De rol van de huidige gebruiker voor een organisatie: rechtstreeks lid, of lid van het bureau erboven.
create or replace function public.org_role(org uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select m.role from members m where m.organization_id = org and m.user_id = auth.uid()),
    (select m.role
       from organizations o
       join members m on m.organization_id = o.agency_parent_id and m.user_id = auth.uid()
      where o.id = org
        and (m.ad_account_ids is null
             or exists (select 1 from ad_accounts a where a.organization_id = o.id and a.id = any (m.ad_account_ids))))
  );
$$;

create or replace function public.can_access_org(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.org_role(org) is not null;
$$;

create or replace function public.can_edit_org(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.org_role(org) in ('eigenaar', 'beheerder'), false);
$$;

create or replace function public.is_org_owner(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.org_role(org) = 'eigenaar', false);
$$;

create or replace function public.shares_org_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members a join members b on a.organization_id = b.organization_id
     where a.user_id = auth.uid() and b.user_id = other
  ) or exists (
    select 1 from members b where b.user_id = other and public.can_access_org(b.organization_id)
  );
$$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.adsweet_admins enable row level security;
alter table public.members enable row level security;
alter table public.invitations enable row level security;
alter table public.ad_accounts enable row level security;
alter table public.business_profiles enable row level security;
alter table public.goals enable row level security;
alter table public.documents enable row level security;
alter table public.media enable row level security;
alter table public.connections enable row level security;
alter table public.campaigns enable row level security;
alter table public.ad_sets enable row level security;
alter table public.ads enable row level security;
alter table public.insights_daily enable row level security;
alter table public.playbook_versions enable row level security;
alter table public.audit_runs enable row level security;
alter table public.recommendations enable row level security;
alter table public.log_entries enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_settings enable row level security;
alter table public.autopilot_settings enable row level security;
alter table public.rules enable row level security;
alter table public.assistant_threads enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.credits_ledger enable row level security;
alter table public.user_tours enable row level security;
alter table public.academy_progress enable row level security;
alter table public.invoices enable row level security;
alter table public.discount_codes enable row level security;
alter table public.referrals enable row level security;
alter table public.partners enable row level security;
alter table public.calls enable row level security;
alter table public.waitlist enable row level security;

-- Organisaties: aanmaken gebeurt op de server (service role) bij account maken.
create policy org_select on public.organizations for select to authenticated using (public.can_access_org(id) or public.is_adsweet_admin());
create policy org_update on public.organizations for update to authenticated using (public.can_edit_org(id)) with check (public.can_edit_org(id));

create policy profiles_select on public.profiles for select to authenticated using (user_id = auth.uid() or public.shares_org_with(user_id) or public.is_adsweet_admin());
create policy profiles_update on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy admins_select on public.adsweet_admins for select to authenticated using (user_id = auth.uid());

create policy members_select on public.members for select to authenticated using (user_id = auth.uid() or public.can_access_org(organization_id));
create policy members_write on public.members for all to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));

create policy invitations_select on public.invitations for select to authenticated using (public.can_edit_org(organization_id));
create policy invitations_write on public.invitations for all to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));

-- Gewone tabellen per organisatie: lezen wie toegang heeft, schrijven wie mag bewerken (geen lezer).
do $$
declare t text;
begin
  foreach t in array array['ad_accounts', 'business_profiles', 'goals', 'documents', 'media', 'connections', 'campaigns',
                           'ad_sets', 'ads', 'recommendations', 'log_entries', 'notifications', 'autopilot_settings', 'rules',
                           'referrals', 'calls']
  loop
    execute format('create policy %I on public.%I for select to authenticated using (public.can_access_org(organization_id) or public.is_adsweet_admin())', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.can_edit_org(organization_id))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.can_edit_org(organization_id))', t || '_delete', t);
  end loop;
end $$;

-- Alleen lezen: cijfers, audits en credits schrijft de server.
create policy insights_select on public.insights_daily for select to authenticated using (public.can_access_org(organization_id) or public.is_adsweet_admin());
create policy audit_runs_select on public.audit_runs for select to authenticated using (public.can_access_org(organization_id) or public.is_adsweet_admin());
create policy credits_select on public.credits_ledger for select to authenticated using (public.can_access_org(organization_id) or public.is_adsweet_admin());

-- Abonnement en facturen: alleen de eigenaar.
create policy invoices_select on public.invoices for select to authenticated using (public.is_org_owner(organization_id) or public.is_adsweet_admin());

create policy notification_settings_own on public.notification_settings for all to authenticated
  using (user_id = auth.uid() and public.can_access_org(organization_id))
  with check (user_id = auth.uid() and public.can_access_org(organization_id));

create policy assistant_threads_own on public.assistant_threads for all to authenticated
  using (user_id = auth.uid() and public.can_access_org(organization_id))
  with check (user_id = auth.uid() and public.can_access_org(organization_id));
create policy assistant_messages_own on public.assistant_messages for all to authenticated
  using (exists (select 1 from public.assistant_threads t where t.id = thread_id and t.user_id = auth.uid()))
  with check (exists (select 1 from public.assistant_threads t where t.id = thread_id and t.user_id = auth.uid()));

create policy user_tours_own on public.user_tours for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy academy_progress_own on public.academy_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy playbook_select on public.playbook_versions for select to authenticated using (status = 'gepubliceerd' or public.is_adsweet_admin());
create policy playbook_admin on public.playbook_versions for all to authenticated using (public.is_adsweet_admin()) with check (public.is_adsweet_admin());

create policy discount_codes_admin on public.discount_codes for all to authenticated using (public.is_adsweet_admin()) with check (public.is_adsweet_admin());
create policy partners_admin on public.partners for all to authenticated using (public.is_adsweet_admin()) with check (public.is_adsweet_admin());
create policy calls_admin on public.calls for all to authenticated using (public.is_adsweet_admin()) with check (public.is_adsweet_admin());
create policy waitlist_admin on public.waitlist for select to authenticated using (public.is_adsweet_admin());

-- ---------------------------------------------------------------------------
-- Nieuwe gebruiker: profiel aanmaken
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, first_name, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'first_name', split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1)),
    new.raw_user_meta_data ->> 'full_name'
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Opslag: documenten, beelden, merk. Het eerste deel van het pad is de organisatie.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false), ('media', 'media', false), ('brand', 'brand', false)
on conflict (id) do nothing;

create policy storage_select on storage.objects for select to authenticated
  using (bucket_id in ('documents', 'media', 'brand') and public.can_access_org(((storage.foldername(name))[1])::uuid));
create policy storage_insert on storage.objects for insert to authenticated
  with check (bucket_id in ('documents', 'media', 'brand') and public.can_edit_org(((storage.foldername(name))[1])::uuid));
create policy storage_update on storage.objects for update to authenticated
  using (bucket_id in ('documents', 'media', 'brand') and public.can_edit_org(((storage.foldername(name))[1])::uuid));
create policy storage_delete on storage.objects for delete to authenticated
  using (bucket_id in ('documents', 'media', 'brand') and public.can_edit_org(((storage.foldername(name))[1])::uuid));

-- Rechten voor de API-rollen van Supabase.
grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all functions in schema public to authenticated, service_role;

-- ===== 20261202000000_preview_links.sql =====

-- Preview-links (V1): advertenties laten nakijken zonder account, bv. door een vennoot.
-- De publieke pagina /p/[code] leest via de server (service role) op basis van de code; de klant ziet het resultaat.

create table public.preview_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  campaign_id uuid not null references public.campaigns (id) on delete cascade,
  code text not null unique default encode(gen_random_bytes(9), 'hex'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.preview_feedback (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.preview_links (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  ad_id uuid not null references public.ads (id) on delete cascade,
  status text not null check (status in ('goedgekeurd', 'opmerking')),
  note text,
  created_at timestamptz not null default now(),
  unique (link_id, ad_id)
);

alter table public.preview_links enable row level security;
alter table public.preview_feedback enable row level security;

create policy preview_links_select on public.preview_links for select to authenticated using (public.can_access_org(organization_id));
create policy preview_links_write on public.preview_links for all to authenticated using (public.can_edit_org(organization_id)) with check (public.can_edit_org(organization_id));
create policy preview_feedback_select on public.preview_feedback for select to authenticated using (public.can_access_org(organization_id));

grant select, insert, update, delete on public.preview_links, public.preview_feedback to authenticated, service_role;

-- ===== 20261203000000_onboarding.sql =====

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

-- ===== 20261204000000_settings.sql =====

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

-- ===== 20261205000000_meta_tokens.sql =====

-- Meta-sleutels van gebruikers ("Doorgaan met Facebook"). De sleutel zelf staat versleuteld in Supabase Vault; de tabel
-- en de functies zijn alleen voor de server (service role). De app leest nooit een sleutel in de browser.

create table public.meta_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  vault_secret_id uuid not null,
  fb_user_id text,
  fb_name text,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.meta_tokens enable row level security;
revoke all on public.meta_tokens from anon, authenticated;

-- Met wiens sleutel de cijfers van deze koppeling opgehaald worden. Leeg: de sleutel van de systeemgebruiker.
alter table public.connections
  add column meta_token_user uuid references auth.users (id) on delete set null;

create or replace function public.save_meta_token(p_user uuid, p_token text, p_expires timestamptz, p_fb_user text, p_fb_name text)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  select vault_secret_id into v_id from public.meta_tokens where user_id = p_user;
  if v_id is null then
    v_id := vault.create_secret(p_token, null, 'Meta-sleutel van gebruiker ' || p_user::text);
  else
    perform vault.update_secret(v_id, p_token);
  end if;
  insert into public.meta_tokens (user_id, vault_secret_id, fb_user_id, fb_name, expires_at, updated_at)
  values (p_user, v_id, p_fb_user, p_fb_name, p_expires, now())
  on conflict (user_id) do update
    set vault_secret_id = excluded.vault_secret_id,
        fb_user_id = excluded.fb_user_id,
        fb_name = excluded.fb_name,
        expires_at = excluded.expires_at,
        updated_at = now();
end;
$$;

create or replace function public.meta_token(p_user uuid)
returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  v text;
begin
  select s.decrypted_secret into v
  from vault.decrypted_secrets s
  join public.meta_tokens t on t.vault_secret_id = s.id
  where t.user_id = p_user;
  return v;
end;
$$;

revoke all on function public.save_meta_token(uuid, text, timestamptz, text, text) from public, anon, authenticated;
revoke all on function public.meta_token(uuid) from public, anon, authenticated;
grant execute on function public.save_meta_token(uuid, text, timestamptz, text, text) to service_role;
grant execute on function public.meta_token(uuid) to service_role;
grant select, insert, update, delete on public.meta_tokens to service_role;

-- ===== Instellingen =====

insert into public.playbook_versions (id, version, status, rules, note, published_at, created_at) values
  ('f2e05920-ca82-521b-bcf0-b8f9d308bf30', '1.0', 'gepubliceerd', '{"minDailyBudget":{"default":10,"webshop":30},"loserMultiple":3,"startStructure":{"campaigns":1,"adSets":1,"ads":5,"photos":3,"videos":2},"scaleStep":0.2,"newAdSetEveryWeeks":2,"funnelSplit":{"top":2,"middle":2,"bottom":1},"statusWarnRatio":0.75}'::jsonb, 'Eerste versie van het playbook.', '2026-11-01T09:00:00+01:00', '2026-11-01T09:00:00+01:00');
insert into public.discount_codes (id, code, kind, percent_off, max_uses, uses) values
  ('0f1c7dbe-1352-567a-92dd-1403f593eeac', 'FOUNDING50', 'founding', 30, 50, 1);
