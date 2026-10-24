# Datamodel (Supabase / Postgres)

Alle tabellen met RLS: een rij is zichtbaar voor leden van `organization_id` (en voor Agency-leden met recht op dat `ad_account_id`).

- **organizations** id, name, kind (webshop/dienstverlener/lokaal/zelfstandige), plan, billing_period, trial_ends_at, founding, agency_parent_id
- **members** user_id, organization_id, role (eigenaar/beheerder/lezer), ad_account_ids[] (Agency)
- **business_profiles** organization_id, website, sells, tone[], region, colors[], font, logo_path, never_say, differentiator, best_customers, competitors[]
- **goals** organization_id, type (verkopen/aanvragen/zaak/anders), aov, margin, target_roas, target_cpl, clv, close_rate
- **documents** organization_id, category (prijs/reviews/resultaten/anders/brandguide), storage_path, status, extracted jsonb
- **media** organization_id, storage_path, kind (foto/video), source (website/upload/drive/studio), used_in[]
- **connections** organization_id, provider (meta/google/drive/…), status, encrypted_token (via Supabase Vault), expires_at, meta_ad_account_id, page_id, ig_id, pixel_id
- **campaigns** id, organization_id, meta_id, name, kind (vast/solden/bf/feest/event/nieuw), goal, status, daily_budget, start, end, outside_adsweet bool
- **ad_sets** id, campaign_id, meta_id, name, reason, locked bool
- **ads** id, ad_set_id, meta_id, code (A1…), name, kind, phase (top/middle/bottom), primary_text, headline, description, cta, extras jsonb, label
- **insights_daily** ad_id, date, spend, impressions, reach, clicks, link_clicks, lpv, view_content, add_to_cart, checkout, purchases, revenue, leads, video_3s, video_thruplay
- **recommendations** id, organization_id, audit_run_id, type, severity (act/warn/info), payload jsonb, status (open/gedaan/later/zo-laten), decided_by, decided_at
- **audit_runs** id, organization_id, ran_at, score, playbook_version
- **log_entries** id, organization_id, at, actor (user/autopilot/outside/adsweet), what, from_to, undo jsonb
- **notifications** id, organization_id, type, severity, read_at, emailed_at
- **autopilot_settings** organization_id, mode (uit/vraag/grenzen), limits jsonb
- **rules** id, organization_id, metric, comparator, value, window, action
- **assistant_threads / assistant_messages** organization_id, role, content, tool_calls jsonb, pending_change jsonb
- **credits_ledger** organization_id, delta, reason, model, cost_eur
- **user_tours** user_id, tour, seen_at
- **playbook_versions** id, version, status (concept/gepubliceerd), rules jsonb, published_at (alleen beheer)
- **invoices, discount_codes, referrals, partners, calls** zoals in Beheer.dc.html

Seed (`packages/db/seed.sql`): de scenario's Lisa (Atelier Noor, Pro), Tom (Peeters Dakwerken, Starter), Sarah (Salon Mila, Pro, dag 1), Bram (3 webshops, Scale), Eva (Bureau Kompas, Agency, 6 klanten) met alle cijfers uit de prototypes.
