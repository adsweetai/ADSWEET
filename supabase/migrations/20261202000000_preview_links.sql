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
