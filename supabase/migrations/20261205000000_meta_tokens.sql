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
