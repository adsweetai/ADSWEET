// De demo-scenario's uit de brief (deel C3) en de prototypes in design/.
// Alle bedragen en aantallen komen daaruit. Waar de prototypes een plaatshouder tonen ([budget], [datum], [uit Meta]),
// blijft het veld hier leeg. De verdeling van weektotalen over dagen is gelijkmatig; de totalen kloppen met C3.

import { seedId } from "../ids";
import type { AdExtras, FunnelPhase, Targeting } from "../types";
import { at, dateRange, emptySeed, spreadInt, spreadMoney, type SeedData, type SeedTables, type SeedUser } from "./helpers";

export const DEMO_TODAY = "2026-12-07";
export const LAST7_FROM = "2026-11-30";
export const AUDIT_AT = at(DEMO_TODAY, "06:00");

export const DEMO_USERS = {
  lisa: { email: "lisa@ateliernoor.voorbeeld", first_name: "Lisa" },
  tom: { email: "tom@peetersdakwerken.voorbeeld", first_name: "Tom" },
  sarah: { email: "sarah@salonmila.voorbeeld", first_name: "Sarah" },
  bram: { email: "bram@veldenvuur.voorbeeld", first_name: "Bram" },
  eva: { email: "eva@bureaukompas.voorbeeld", first_name: "Eva" },
  beheer: { email: "team@adsweet.voorbeeld", first_name: "AdSweet" },
  // Een teamlid van Bureau Kompas, voor de rechten per klant. Geen verzonnen naam: "Teamlid".
  kompasTeam: { email: "teamlid@bureaukompas.voorbeeld", first_name: "Teamlid" },
} as const;

export type DemoUserKey = keyof typeof DEMO_USERS;

// Vorige bezoek: Lisa kwam gisteren, zo toont Vandaag "Sweet! 3 nieuwe verkopen sinds gisteren."
const LAST_SEEN: Partial<Record<DemoUserKey, string>> = {
  lisa: "2026-12-06T09:00:00+01:00",
  tom: "2026-12-07T05:30:00+01:00",
  bram: "2026-12-07T05:30:00+01:00",
  eva: "2026-12-07T05:30:00+01:00",
};

export const userId = (key: DemoUserKey) => seedId(`user:${key}`);

type Seed = SeedData & SeedTables;

/** Naamgeving en UTM's: de korte naam van de zaak komt vooraan in elke campagnenaam. */
const NAMING = (short: string) => ({
  short,
  campaign: "{zaak} · {soort} · {doel} · {maand}",
  ad_set: "AS{n} · {datum} · {reden}",
  ad: "{code} · {fase} · {soort} · {naam}",
  utm_source: "meta",
  utm_medium: "paid_social",
});

const EXTRAS_OFF: AdExtras = {
  muziek: false,
  tekst_op_beeld: false,
  beelduitbreiding: false,
  varianten: false,
};

interface AdSpec {
  code: string;
  name: string;
  kind: "foto" | "video";
  phase: FunnelPhase;
  label: "winnaar" | "geen" | "verliezer" | "vroeg";
  extras?: Partial<AdExtras>;
}

interface ScenarioOptions {
  /** Voorvoegsel voor de sleutels, zodat een kloon onder het bureau eigen rijen krijgt. */
  key: string;
  /** Rechtstreeks lid (eigenaar). Leeg bij een klant van een bureau. */
  owner?: DemoUserKey;
  agencyParentId?: string;
  agencyOwner?: DemoUserKey | null;
  /** Volgorde in het klantenoverzicht van het bureau. */
  clientIndex?: number;
}

function addUser(seed: Seed, key: DemoUserKey) {
  if (seed.users.some((u) => u.id === userId(key))) return;
  const u = DEMO_USERS[key];
  const user: SeedUser = { id: userId(key), email: u.email, first_name: u.first_name, full_name: null, last_seen_at: LAST_SEEN[key] ?? null };
  seed.users.push(user);
}

/** Voorbeelden van de andere soorten meldingen (prototype: "voorbeeld"), met plaatshouders. */
function addExampleNotes(seed: Seed, k: string, orgId: string) {
  const examples: [string, "act" | "warn", string][] = [
    ["kosten_hoger", "act", "/advertenties"],
    ["afgekeurd", "act", "/advertenties/maken"],
    ["pixel", "act", "/academy"],
    ["budget_minimum", "warn", "/campagnes"],
    ["koppeling_verlopen", "act", "/instellingen/koppelingen"],
  ];
  examples.forEach(([type, severity, href], i) =>
    seed.notifications.push({
      id: seedId(`${k}:note:voorbeeld:${type}`),
      organization_id: orgId,
      type,
      severity,
      payload: { example: true },
      href,
      created_at: at(`2026-11-0${5 - i}`, "06:00"),
    }),
  );
}

function orgBase(opts: ScenarioOptions) {
  return opts.agencyParentId
    ? {
        plan: "agency" as const,
        subscription_status: "actief" as const,
        trial_started_at: null,
        trial_ends_at: null,
        founding: false,
        agency_parent_id: opts.agencyParentId,
        agency_owner_user_id: opts.agencyOwner ? userId(opts.agencyOwner) : null,
        created_at: at(`2026-09-0${(opts.clientIndex ?? 0) + 2}`, "10:00"),
      }
    : {};
}

function addOwner(seed: Seed, opts: ScenarioOptions, orgId: string) {
  if (!opts.owner) return;
  addUser(seed, opts.owner);
  seed.members.push({
    id: seedId(`${opts.key}:member:${opts.owner}`),
    user_id: userId(opts.owner),
    organization_id: orgId,
    role: "eigenaar",
  });
}

function addAds(
  seed: Seed,
  k: string,
  orgId: string,
  campaignId: string,
  adSetId: string,
  startedAt: string,
  specs: AdSpec[],
  copy: (s: AdSpec) => { texts: string[]; headline: string; description: string; cta: string },
) {
  for (const s of specs) {
    const c = copy(s);
    seed.ads.push({
      id: seedId(`${k}:ad:${s.code}`),
      organization_id: orgId,
      campaign_id: campaignId,
      ad_set_id: adSetId,
      code: s.code,
      name: s.name,
      kind: s.kind,
      phase: s.phase,
      primary_text: c.texts[0],
      headline: c.headline,
      description: c.description,
      cta: c.cta,
      variants: { primary_text: c.texts },
      extras: { ...EXTRAS_OFF, ...s.extras },
      label: s.label,
      status: "actief",
      review_status: "goedgekeurd",
      started_at: startedAt,
    });
  }
}

/** Dagrijen voor één advertentie of campagne. */
function addDaily(
  seed: Seed,
  base: { organization_id: string; campaign_id: string; ad_id: string | null },
  dates: string[],
  values: {
    spend: number[];
    purchases?: number[];
    revenue?: number[];
    leads?: number[];
    impressions?: number[];
    reach?: number[];
    clicks?: number[];
    link_clicks?: number[];
    lpv?: number[];
    view_content?: number[];
    add_to_cart?: number[];
    checkout?: number[];
    video_3s?: number[];
    video_thruplay?: number[];
  },
) {
  dates.forEach((date, i) => {
    seed.insights_daily.push({
      ...base,
      date,
      spend: values.spend[i],
      purchases: values.purchases ? values.purchases[i] : null,
      revenue: values.revenue ? values.revenue[i] : null,
      leads: values.leads ? values.leads[i] : null,
      impressions: values.impressions ? values.impressions[i] : null,
      reach: values.reach ? values.reach[i] : null,
      clicks: values.clicks ? values.clicks[i] : null,
      link_clicks: values.link_clicks ? values.link_clicks[i] : null,
      lpv: values.lpv ? values.lpv[i] : null,
      view_content: values.view_content ? values.view_content[i] : null,
      add_to_cart: values.add_to_cart ? values.add_to_cart[i] : null,
      checkout: values.checkout ? values.checkout[i] : null,
      video_3s: values.video_3s ? values.video_3s[i] : null,
      video_thruplay: values.video_thruplay ? values.video_thruplay[i] : null,
    });
  });
}

// ---------------------------------------------------------------------------
// Lisa · Atelier Noor · webshop · Pro · founding member
// ---------------------------------------------------------------------------

const LISA_ADS: AdSpec[] = [
  { code: "A1", name: "Kaars wordt aangestoken", kind: "video", phase: "top", label: "winnaar" },
  {
    code: "A2",
    name: "Zo gieten we ze",
    kind: "video",
    phase: "middle",
    label: "winnaar",
    extras: { muziek: true },
  },
  { code: "A3", name: "Geschenkdoos", kind: "foto", phase: "bottom", label: "geen" },
  { code: "A4", name: "Sfeerbeeld woonkamer", kind: "foto", phase: "top", label: "verliezer" },
  { code: "A5", name: "Klantreview", kind: "foto", phase: "middle", label: "vroeg" },
];

// Laatste 7 dagen (30 november tot en met 6 december). Verkopen per dag zo gekozen dat er op 6 december 3 bijkwamen.
const LISA_7D: Record<string, { spend: number; purchases: number[] }> = {
  A1: { spend: 82, purchases: [1, 0, 1, 1, 0, 1, 1] },
  A2: { spend: 71, purchases: [0, 1, 1, 0, 1, 0, 1] },
  A3: { spend: 48, purchases: [0, 1, 0, 0, 0, 0, 1] },
  A4: { spend: 72, purchases: [0, 0, 0, 0, 0, 0, 0] },
  A5: { spend: 7, purchases: [0, 0, 0, 0, 0, 0, 0] },
};
export const LISA = { aov: 58, margin: 0.4, budget: 40, raisedBudget: 48 };

export function buildLisa(seed: Seed, opts: ScenarioOptions) {
  const k = opts.key;
  const orgId = seedId(`${k}:org`);
  const accId = seedId(`${k}:account`);
  seed.organizations.push({
    id: orgId,
    name: "Atelier Noor",
    kind: "webshop",
    plan: "pro",
    billing_period: "maandelijks",
    subscription_status: "proef",
    trial_started_at: "2026-11-16",
    trial_ends_at: "2026-12-16",
    founding: true,
    color: "roos",
    onboarding_step: 11,
    onboarding_done: true,
    tuning_step: 1,
    naming: NAMING("Noor"),
    created_at: at("2026-11-16", "09:12"),
    ...orgBase(opts),
  });
  addOwner(seed, opts, orgId);
  addExampleNotes(seed, opts.key, orgId);
  seed.ad_accounts.push({
    id: accId,
    organization_id: orgId,
    name: "Atelier Noor",
    currency: "EUR",
    status: "actief",
    sort: 0,
  });

  const targeting: Targeting = {
    area: "land",
    region: "België",
    countries: ["België"],
    languages: ["Nederlands"],
    age_min: 25,
    age_max: 65,
  };
  seed.business_profiles.push({
    organization_id: orgId,
    website: "ateliernoor.voorbeeld",
    sells: "Handgemaakte kaarsen en geschenkdozen",
    offers: [],
    tone: ["warm", "ambachtelijk", "rustig"],
    tone_example: "Elke kaars gieten we met de hand.",
    region: "België · [adres]",
    colors: ["#3A2E2A", "#EDE3D6"],
    contact: { delivery: "webshop, levering in België" },
    payer: "Atelier Noor",
    beneficiary: "Atelier Noor",
  });
  seed.goals.push({
    id: seedId(`${k}:goal`),
    organization_id: orgId,
    type: "verkopen",
    aov: LISA.aov,
    margin: LISA.margin,
    target_roas: null,
    targeting,
  });
  seed.connections.push({
    id: seedId(`${k}:conn:meta`),
    organization_id: orgId,
    ad_account_id: accId,
    provider: "meta",
    status: "gekoppeld",
    connected_at: at("2026-11-16", "09:20"),
    page_name: "Atelier Noor",
    ig_name: "@ateliernoor",
    pixel_name: "Atelier Noor pixel",
    pixel_ok: true,
  });
  seed.autopilot_settings.push({ organization_id: orgId, mode: "vraag", limits: {} });
  // Regel uit het prototype: "Als kost per verkoop hoger is dan €30, 2 dagen na elkaar, dan stuur me een melding."
  seed.rules.push({
    id: seedId(`${k}:rule:cpa`),
    organization_id: orgId,
    metric: "kost_per_verkoop",
    comparator: "hoger",
    value: 30,
    window: "2_dagen",
    action: "melding",
  });

  // Vaste campagne
  const campId = seedId(`${k}:camp:vast`);
  seed.campaigns.push({
    id: campId,
    organization_id: orgId,
    ad_account_id: accId,
    name: "Noor · Vast · Verkopen · nov26",
    kind: "vast",
    goal: "verkopen",
    status: "actief",
    daily_budget: LISA.budget,
    start_date: "2026-11-17",
    targeting,
    payer: "Atelier Noor",
    beneficiary: "Atelier Noor",
    utm: { source: "meta", medium: "paid_social", campaign: "noor-vast-verkopen" },
    launched_at: at("2026-11-17", "10:05"),
    created_at: at("2026-11-17", "10:05"),
  });
  const adSetId = seedId(`${k}:adset:vast:1`);
  seed.ad_sets.push({
    id: adSetId,
    organization_id: orgId,
    campaign_id: campId,
    name: "AS1 · 17-11-2026 · start",
    reason: "start",
    start_date: "2026-11-17",
    learning: false,
    locked: true,
    status: "actief",
  });
  const lisaTexts = ["Elke kaars gieten we met de hand, in kleine reeksen.", "Zacht licht voor lange avonden.", "Handgemaakte kaarsen uit ons atelier."];
  addAds(seed, k, orgId, campId, adSetId, "2026-11-17", LISA_ADS, (s) => ({
    texts: lisaTexts,
    headline: "Handgemaakte kaarsen",
    description: "Levering in België",
    cta: s.phase === "bottom" ? "Nu kopen" : "Meer informatie",
  }));

  // Beelden (bibliotheek): van de website, opgeladen of gemaakt in Studio.
  const MEDIA: [string, string, "foto" | "video", "website" | "upload" | "studio", string | null][] = [
    ["m1", "kaars-wordt-aangestoken.mp4", "video", "website", "A1"],
    ["m2", "sfeerbeeld-woonkamer.jpg", "foto", "website", "A4"],
    ["m3", "zo-gieten-we-ze.mp4", "video", "upload", "A2"],
    ["m4", "geschenkdoos.jpg", "foto", "upload", "A3"],
    ["m5", "klantreview.jpg", "foto", "studio", "A5"],
    ["m6", "studio-kerstdoos.jpg", "foto", "studio", null],
    ["m7", "studio-kaars-close-up.jpg", "foto", "studio", null],
    ["m8", "atelier-tafel.jpg", "foto", "website", null],
  ];
  MEDIA.forEach(([key, name, kind, source, code], i) => {
    const id = seedId(`${k}:media:${key}`);
    const adId = code ? seedId(`${k}:ad:${code}`) : null;
    seed.media.push({
      id,
      organization_id: orgId,
      name,
      kind,
      source,
      used_in: adId ? [adId] : [],
      created_at: at(`2026-11-${String(10 + i).padStart(2, "0")}`, "12:00"),
    });
    const ad = adId ? seed.ads.find((x) => x.id === adId) : null;
    if (ad) ad.media_id = id;
  });

  const days = dateRange(LAST7_FROM, 7);
  for (const spec of LISA_ADS) {
    const d = LISA_7D[spec.code];
    const extra =
      spec.code === "A1"
        ? // A1: CTR 1,4% en frequentie 2,8 (C3). Alleen de verhoudingen zijn gekend.
          { impressions: spreadInt(10000, 7), reach: spreadInt(3572, 7), link_clicks: spreadInt(140, 7) }
        : {};
    addDaily(seed, { organization_id: orgId, campaign_id: campId, ad_id: seedId(`${k}:ad:${spec.code}`) }, days, {
      spend: spreadMoney(d.spend, 7),
      purchases: d.purchases,
      revenue: d.purchases.map((p) => p * LISA.aov),
      ...extra,
    });
  }
  // Cijfers op campagneniveau uit het prototype ("Alle cijfers uit Meta", voorbeeld): 36,8k vertoningen, 13.100 bereik,
  // 412 linkklikken (1,12%), 1,90% CTR (alle klikken), 331 landingpaginaweergaven, 298 productweergaven, 41 in winkelmand,
  // 19 afrekeningen, hook rate 24,6% en hold rate 7,9%. Wat A1 al heeft (10.000 vertoningen, 3.572 bereik, 140 klikken) gaat eraf.
  addDaily(seed, { organization_id: orgId, campaign_id: campId, ad_id: null }, days, {
    spend: Array(7).fill(0),
    impressions: spreadInt(36800 - 10000, 7),
    reach: spreadInt(13100 - 3572, 7),
    clicks: spreadInt(Math.round(36800 * 0.019), 7),
    link_clicks: spreadInt(412 - 140, 7),
    lpv: spreadInt(331, 7),
    view_content: spreadInt(298, 7),
    add_to_cart: spreadInt(41, 7),
    checkout: spreadInt(19, 7),
    video_3s: spreadInt(Math.round(36800 * 0.246), 7),
    video_thruplay: spreadInt(Math.round(36800 * 0.079), 7),
  });

  // Black Friday, afgelopen: €180, 9 verkopen, €522 (27 tot en met 30 november)
  const bfId = seedId(`${k}:camp:bf`);
  seed.campaigns.push({
    id: bfId,
    organization_id: orgId,
    ad_account_id: accId,
    name: "Black Friday",
    kind: "bf",
    goal: "verkopen",
    status: "afgelopen",
    daily_budget: 45,
    start_date: "2026-11-27",
    end_date: "2026-11-30",
    targeting,
    payer: "Atelier Noor",
    beneficiary: "Atelier Noor",
    utm: { source: "meta", medium: "paid_social", campaign: "noor-bf-verkopen" },
    launched_at: at("2026-11-26", "20:41"),
    created_at: at("2026-11-26", "20:41"),
  });
  const bfPurchases = [2, 2, 2, 3];
  addDaily(seed, { organization_id: orgId, campaign_id: bfId, ad_id: null }, dateRange("2026-11-27", 4), {
    spend: [45, 45, 45, 45],
    purchases: bfPurchases,
    revenue: bfPurchases.map((p) => p * LISA.aov),
  });

  // Campagne buiten AdSweet gemaakt (voorbeeld uit het prototype)
  seed.campaigns.push({
    id: seedId(`${k}:camp:voorjaar`),
    organization_id: orgId,
    ad_account_id: accId,
    name: "Voorjaar 2026 (voorbeeld)",
    kind: "vast",
    goal: "verkopen",
    status: "gepauzeerd",
    daily_budget: null,
    budget_level: "adset",
    outside_adsweet: true,
    deviations: ["budget per ad set", "interesses in 2 ad sets"],
    created_at: at("2026-03-01", "12:00"),
  });

  // Dagelijkse audit van 7 december
  const runId = seedId(`${k}:audit:20261207`);
  seed.audit_runs.push({
    id: runId,
    organization_id: orgId,
    ran_at: AUDIT_AT,
    playbook_version: "1.0",
    summary: { proposals: 5 },
  });
  const a = (code: string) => seedId(`${k}:ad:${code}`);
  const rec = (n: string) => seedId(`${k}:rec:${n}`);
  seed.recommendations.push(
    {
      id: rec("a4"),
      organization_id: orgId,
      audit_run_id: runId,
      campaign_id: campId,
      ad_id: a("A4"),
      type: "verliezer",
      severity: "act",
      sort: 1,
      status: "open",
      payload: {
        goal: "verkopen",
        ad_name: "Sfeerbeeld woonkamer",
        spend: 72,
        results: 0,
        target: 23.2,
        limit: 69.6,
      },
      created_at: AUDIT_AT,
    },
    {
      id: rec("a4b"),
      organization_id: orgId,
      audit_run_id: runId,
      campaign_id: campId,
      parent_id: rec("a4"),
      type: "schalen_na_verliezer",
      severity: "info",
      sort: 1,
      status: "wacht",
      payload: {
        roas_without: 3.07,
        break_even: 2.5,
        spend_without: 208,
        revenue: 638,
        budget_from: 40,
        budget_to: 48,
        step: 0.2,
      },
      created_at: AUDIT_AT,
    },
    {
      id: rec("music"),
      organization_id: orgId,
      audit_run_id: runId,
      campaign_id: campId,
      ad_id: a("A2"),
      type: "extra_buiten_app",
      severity: "warn",
      sort: 2,
      status: "open",
      payload: { ad_name: "Zo gieten we ze", extra: "muziek", date: "2026-12-05" },
      created_at: AUDIT_AT,
    },
    {
      id: rec("video"),
      organization_id: orgId,
      audit_run_id: runId,
      campaign_id: campId,
      type: "video_beter",
      severity: "info",
      sort: 3,
      status: "open",
      payload: {
        roas_video: 3.41,
        roas_foto: 0.91,
        spend_video: 153,
        revenue_video: 522,
        spend_foto: 127,
        revenue_foto: 116,
      },
      created_at: AUDIT_AT,
    },
    {
      id: rec("xmas"),
      organization_id: orgId,
      audit_run_id: runId,
      type: "speciaal_moment",
      severity: "info",
      sort: 4,
      status: "open",
      payload: { moment: "kerst", weeks: "2,5" },
      created_at: AUDIT_AT,
    },
    {
      id: rec("fatigue"),
      organization_id: orgId,
      audit_run_id: runId,
      campaign_id: campId,
      ad_id: a("A1"),
      type: "vermoeidheid",
      severity: "warn",
      sort: 5,
      status: "open",
      payload: { ad_name: "Kaars wordt aangestoken", ctr_from: 2.1, ctr_to: 1.4, frequency: 2.8 },
      created_at: AUDIT_AT,
    },
  );

  // Logboek (C3)
  const log = (n: string, row: Record<string, unknown>) => seed.log_entries.push({ id: seedId(`${k}:log:${n}`), organization_id: orgId, ...row });
  log("audit", {
    at: AUDIT_AT,
    actor: "adsweet",
    kind: "audit",
    what: "Dagelijkse audit klaar, 5 voorstellen.",
  });
  log("music", {
    at: at("2026-12-05", "14:12"),
    actor: "outside",
    kind: "extra",
    campaign_id: campId,
    what: "Muziek aangezet bij ‘Zo gieten we ze’.",
    from_to: "Uit → Aan",
    undo: { kind: "extra", ad_id: a("A2"), extra: "muziek", value: false },
  });
  log("bf-stop", {
    at: at("2026-11-30", "23:59"),
    actor: "adsweet",
    kind: "campagne",
    campaign_id: bfId,
    what: "Campagne ‘Black Friday’ gestopt op de einddatum.",
    from_to: "Actief → Afgelopen",
  });
  log("bf-live", {
    at: at("2026-11-26", "20:41"),
    actor: "user",
    actor_name: "Lisa",
    user_id: opts.owner ? userId(opts.owner) : null,
    kind: "campagne",
    campaign_id: bfId,
    what: "Campagne ‘Black Friday’ live gezet, €45 per dag, 27 tot en met 30 november.",
  });
  log("vast-live", {
    at: at("2026-11-17", "10:05"),
    actor: "user",
    actor_name: "Lisa",
    user_id: opts.owner ? userId(opts.owner) : null,
    kind: "campagne",
    campaign_id: campId,
    what: "Vaste campagne live gezet, €40 per dag, 5 advertenties.",
  });

  // Meldingen
  const note = (n: string, row: Record<string, unknown>) => seed.notifications.push({ id: seedId(`${k}:note:${n}`), organization_id: orgId, ...row });
  note("music", {
    type: "buiten_app",
    severity: "warn",
    payload: { ad_name: "Zo gieten we ze", extra: "muziek", date: "2026-12-05" },
    href: "/vandaag",
    created_at: at("2026-12-05", "14:12"),
  });
  note("fatigue", {
    type: "vermoeidheid",
    severity: "warn",
    payload: { ctr_from: 2.1, ctr_to: 1.4, frequency: 2.8 },
    href: "/advertenties",
    created_at: AUDIT_AT,
  });
  if (!opts.agencyParentId) {
    note("trial", {
      type: "proef_bijna_om",
      severity: "warn",
      payload: { days_left: 8, pay_date: "2026-12-16", amount: 136.5 },
      href: "/abonnement",
      created_at: AUDIT_AT,
    });
    note("credits", {
      type: "credits_bijna_op",
      severity: "warn",
      payload: { left: 18, total: 50, trial: true },
      href: "/studio",
      created_at: at("2026-12-06", "06:00"),
    });
    // Credits: 50 in de proefperiode, 32 gebruikt (3 AI-beelden aan 10, 2 tekstsets aan 1).
    seed.credits_ledger.push(
      {
        id: seedId(`${k}:cr:trial`),
        organization_id: orgId,
        delta: 50,
        reason: "proefperiode",
        created_at: at("2026-11-16", "09:12"),
      },
      ...[1, 2, 3].map((i) => ({
        id: seedId(`${k}:cr:beeld${i}`),
        organization_id: orgId,
        delta: -10,
        reason: "ai_beeld",
        created_at: at("2026-12-0" + (i + 1), "11:00"),
      })),
      ...[1, 2].map((i) => ({
        id: seedId(`${k}:cr:tekst${i}`),
        organization_id: orgId,
        delta: -1,
        reason: "teksten",
        created_at: at("2026-12-0" + (i + 4), "15:00"),
      })),
    );
  }
  return orgId;
}

// ---------------------------------------------------------------------------
// Tom · Peeters Dakwerken · aanvragen · Starter
// ---------------------------------------------------------------------------

const TOM_ADS: AdSpec[] = [
  { code: "B1", name: "Voor en na", kind: "video", phase: "top", label: "winnaar" },
  { code: "B2", name: "Gratis dakinspectie", kind: "foto", phase: "bottom", label: "winnaar" },
  { code: "B3", name: "Ons team aan het werk", kind: "foto", phase: "top", label: "verliezer" },
  { code: "B4", name: "Een klant vertelt", kind: "video", phase: "middle", label: "geen" },
  { code: "B5", name: "Werkwijze in 4 stappen", kind: "foto", phase: "middle", label: "vroeg" },
];

// Per week: [uitgegeven, aanvragen] voor week 1 (23 tot 29 november) en week 2 (30 november tot 6 december).
const TOM_WEEKS: Record<string, [[number, number], [number, number]]> = {
  B1: [
    [30, 2],
    [34, 3],
  ],
  B2: [
    [23, 1],
    [25, 2],
  ],
  B3: [
    [32, 0],
    [28, 0],
  ],
  B4: [
    [16, 1],
    [14, 0],
  ],
  B5: [
    [4, 0],
    [4, 0],
  ],
};
export const TOM = { targetCpl: 20, clv: 2000, margin: 0.25, closeRate: 0.04, budget: 15 };

export function buildTom(seed: Seed, opts: ScenarioOptions) {
  const k = opts.key;
  const orgId = seedId(`${k}:org`);
  const accId = seedId(`${k}:account`);
  seed.organizations.push({
    id: orgId,
    name: "Peeters Dakwerken",
    kind: "dienstverlener",
    plan: "starter",
    billing_period: "maandelijks",
    subscription_status: "proef",
    trial_started_at: "2026-11-15",
    trial_ends_at: "2026-12-15",
    founding: false,
    color: "staal",
    onboarding_step: 11,
    onboarding_done: true,
    tuning_step: 1,
    naming: NAMING("Peeters"),
    created_at: at("2026-11-15", "08:30"),
    ...orgBase(opts),
  });
  addOwner(seed, opts, orgId);
  addExampleNotes(seed, opts.key, orgId);
  seed.ad_accounts.push({
    id: accId,
    organization_id: orgId,
    name: "Peeters Dakwerken",
    currency: "EUR",
    status: "betaalprobleem",
    payment_method_ok: false,
    sort: 0,
  });

  const targeting: Targeting = {
    area: "prov",
    region: "Limburg en Antwerpen",
    countries: ["België"],
    languages: ["Nederlands"],
    age_min: 18,
    age_max: null,
  };
  seed.business_profiles.push({
    organization_id: orgId,
    website: "peetersdakwerken.voorbeeld",
    sells: "Dakwerken",
    region: "Limburg en Antwerpen",
    payer: "Peeters Dakwerken",
    beneficiary: "Peeters Dakwerken",
  });
  seed.goals.push({
    id: seedId(`${k}:goal`),
    organization_id: orgId,
    type: "aanvragen",
    target_cpl: TOM.targetCpl,
    clv: TOM.clv,
    margin: TOM.margin,
    close_rate: TOM.closeRate,
    targeting,
  });
  seed.connections.push({
    id: seedId(`${k}:conn:meta`),
    organization_id: orgId,
    ad_account_id: accId,
    provider: "meta",
    status: "gekoppeld",
    connected_at: at("2026-11-15", "08:41"),
    page_name: "Peeters Dakwerken",
    ig_name: "@peetersdakwerken",
    pixel_name: "Peeters Dakwerken pixel",
    pixel_ok: true,
  });
  seed.autopilot_settings.push({ organization_id: orgId, mode: "vraag", limits: {} });

  const campId = seedId(`${k}:camp:vast`);
  seed.campaigns.push({
    id: campId,
    organization_id: orgId,
    ad_account_id: accId,
    name: "Peeters · Vast · Aanvragen · nov26",
    kind: "vast",
    goal: "aanvragen",
    status: "actief",
    daily_budget: TOM.budget,
    start_date: "2026-11-23",
    targeting,
    payer: "Peeters Dakwerken",
    beneficiary: "Peeters Dakwerken",
    utm: { source: "meta", medium: "paid_social", campaign: "peeters-vast-aanvragen" },
    launched_at: "2026-11-23T00:00:00+01:00",
    created_at: "2026-11-23T00:00:00+01:00",
  });
  const adSetId = seedId(`${k}:adset:vast:1`);
  seed.ad_sets.push({
    id: adSetId,
    organization_id: orgId,
    campaign_id: campId,
    name: "AS1 · 23-11-2026 · start",
    reason: "start",
    start_date: "2026-11-23",
    learning: false,
    locked: true,
    status: "actief",
  });
  const tomTexts = [
    "Zo zag het dak eruit, en zo ziet het er nu uit.",
    "Een nieuw dak zonder zorgen, van inspectie tot oplevering.",
    "Vraag een gratis dakinspectie aan in Limburg of Antwerpen.",
  ];
  addAds(seed, k, orgId, campId, adSetId, "2026-11-23", TOM_ADS, (s) => ({
    texts: tomTexts,
    headline: "Peeters Dakwerken",
    description: "Gratis dakinspectie",
    cta: s.phase === "bottom" ? "Offerte aanvragen" : "Meer informatie",
  }));
  for (const spec of TOM_ADS) {
    const weeks = TOM_WEEKS[spec.code];
    weeks.forEach(([spend, leads], w) => {
      addDaily(
        seed,
        { organization_id: orgId, campaign_id: campId, ad_id: seedId(`${k}:ad:${spec.code}`) },
        dateRange(w === 0 ? "2026-11-23" : LAST7_FROM, 7),
        {
          spend: spreadMoney(spend, 7),
          leads: spreadInt(leads, 7),
        },
      );
    });
  }

  const runId = seedId(`${k}:audit:20261207`);
  seed.audit_runs.push({
    id: runId,
    organization_id: orgId,
    ran_at: AUDIT_AT,
    playbook_version: "1.0",
    summary: { proposals: 3 },
  });
  const rec = (n: string) => seedId(`${k}:rec:${n}`);
  seed.recommendations.push(
    {
      id: rec("b3"),
      organization_id: orgId,
      audit_run_id: runId,
      campaign_id: campId,
      ad_id: seedId(`${k}:ad:B3`),
      type: "verliezer",
      severity: "act",
      sort: 1,
      status: "open",
      payload: {
        goal: "aanvragen",
        ad_name: "Ons team aan het werk",
        spend: 60,
        results: 0,
        target: 20,
        limit: 60,
      },
      created_at: AUDIT_AT,
    },
    {
      id: rec("pay"),
      organization_id: orgId,
      audit_run_id: runId,
      ad_account_id: accId,
      type: "betaalprobleem",
      severity: "act",
      sort: 2,
      status: "open",
      payload: {},
      created_at: AUDIT_AT,
    },
    {
      id: rec("vid"),
      organization_id: orgId,
      audit_run_id: runId,
      campaign_id: campId,
      ad_id: seedId(`${k}:ad:B1`),
      type: "beste_video",
      severity: "info",
      sort: 3,
      status: "open",
      payload: { ad_name: "Voor en na", cpl: 12.8, target: 20 },
      created_at: AUDIT_AT,
    },
  );

  const log = (n: string, row: Record<string, unknown>) => seed.log_entries.push({ id: seedId(`${k}:log:${n}`), organization_id: orgId, ...row });
  log("audit", {
    at: AUDIT_AT,
    actor: "adsweet",
    kind: "audit",
    what: "Dagelijkse audit klaar, 3 voorstellen.",
  });
  log("vast-live", {
    at: "2026-11-23T00:00:00+01:00",
    time_known: false,
    actor: "user",
    actor_name: "Tom",
    user_id: opts.owner ? userId(opts.owner) : null,
    kind: "campagne",
    campaign_id: campId,
    what: "Vaste campagne live gezet, €15 per dag, 5 advertenties.",
  });

  seed.notifications.push({
    id: seedId(`${k}:note:pay`),
    organization_id: orgId,
    type: "betaalprobleem",
    severity: "act",
    payload: {},
    href: "/hulp",
    created_at: AUDIT_AT,
  });
  return orgId;
}

// ---------------------------------------------------------------------------
// Sarah · Salon Mila · kapsalon · Pro · dag 1
// ---------------------------------------------------------------------------

export const SARAH = {
  targetCpl: 15,
  clv: 360,
  margin: 0.5,
  closeRate: 0.25,
  budget: 12,
  proposedBudget: 10,
};

export function buildSarah(seed: Seed, opts: ScenarioOptions) {
  const k = opts.key;
  const orgId = seedId(`${k}:org`);
  const accId = seedId(`${k}:account`);
  seed.organizations.push({
    id: orgId,
    name: "Salon Mila",
    kind: "lokaal",
    plan: "pro",
    billing_period: "maandelijks",
    subscription_status: "proef",
    trial_started_at: "2026-12-07",
    trial_ends_at: "2027-01-06",
    founding: false,
    color: "tarwe",
    onboarding_step: 11,
    onboarding_done: true,
    tuning_step: 1,
    naming: NAMING("Mila"),
    created_at: at("2026-12-06", "19:02"),
    ...orgBase(opts),
  });
  addOwner(seed, opts, orgId);
  addExampleNotes(seed, opts.key, orgId);
  seed.ad_accounts.push({
    id: accId,
    organization_id: orgId,
    name: "Salon Mila",
    currency: "EUR",
    status: "actief",
    sort: 0,
  });

  const targeting: Targeting = {
    area: "radius",
    region: "Hasselt",
    radius_km: 15,
    countries: ["België"],
    languages: ["Nederlands"],
    age_min: 18,
    age_max: null,
  };
  seed.business_profiles.push({
    organization_id: orgId,
    website: "salonmila.voorbeeld",
    sells: "Kapsalon",
    offers: [
      { name: "Knippen dames", price: "€48" },
      { name: "Kleuren", price: "vanaf €75" },
      { name: "Balayage", price: "vanaf €120" },
    ],
    tone: ["warm", "persoonlijk", "rustig"],
    tone_example: "Bij ons neem je even de tijd voor jezelf.",
    region: "Hasselt · [adres] · [telefoon]",
    colors: ["#3D4A3F", "#E8DCCB"],
    payer: "Salon Mila",
    beneficiary: "Salon Mila",
  });
  seed.goals.push({
    id: seedId(`${k}:goal`),
    organization_id: orgId,
    type: "zaak",
    zaak_mode: "aanvragen",
    target_cpl: SARAH.targetCpl,
    clv: SARAH.clv,
    margin: SARAH.margin,
    close_rate: SARAH.closeRate,
    targeting,
  });
  seed.connections.push({
    id: seedId(`${k}:conn:meta`),
    organization_id: orgId,
    ad_account_id: accId,
    provider: "meta",
    status: "gekoppeld",
    connected_at: at("2026-12-06", "19:20"),
    page_name: "Salon Mila",
    ig_name: "@salonmila",
    pixel_name: "Salon Mila pixel",
    pixel_ok: true,
  });
  seed.autopilot_settings.push({ organization_id: orgId, mode: "vraag", limits: {} });

  const campId = seedId(`${k}:camp:vast`);
  seed.campaigns.push({
    id: campId,
    organization_id: orgId,
    ad_account_id: accId,
    name: "Mila · Vast · Afspraken · dec26",
    kind: "vast",
    goal: "aanvragen",
    status: "leerfase",
    daily_budget: SARAH.budget,
    start_date: "2026-12-06",
    targeting,
    payer: "Salon Mila",
    beneficiary: "Salon Mila",
    utm: { source: "meta", medium: "paid_social", campaign: "mila-vast-afspraken" },
    launched_at: at("2026-12-06", "19:40"),
    created_at: at("2026-12-06", "19:40"),
  });
  const adSetId = seedId(`${k}:adset:vast:1`);
  seed.ad_sets.push({
    id: adSetId,
    organization_id: orgId,
    campaign_id: campId,
    name: "AS1 · 06-12-2026 · start",
    reason: "start",
    start_date: "2026-12-06",
    learning: true,
    locked: true,
    status: "actief",
  });
  // Dag 1: vier advertenties goedgekeurd, de vierde wordt nog nagekeken.
  const phases: FunnelPhase[] = ["top", "top", "middle", "middle", "bottom"];
  phases.forEach((phase, i) => {
    const n = i + 1;
    seed.ads.push({
      id: seedId(`${k}:ad:${n}`),
      organization_id: orgId,
      campaign_id: campId,
      ad_set_id: adSetId,
      code: `A${n}`,
      name: `Advertentie ${n}`,
      kind: n === 1 || n === 3 ? "video" : "foto",
      phase,
      extras: EXTRAS_OFF,
      label: "vroeg",
      status: n === 4 ? "in_review" : "actief",
      review_status: n === 4 ? "wordt_nagekeken" : "goedgekeurd",
      started_at: "2026-12-06",
    });
  });
  seed.audit_runs.push({
    id: seedId(`${k}:audit:20261207`),
    organization_id: orgId,
    ran_at: AUDIT_AT,
    playbook_version: "1.0",
    summary: { proposals: 0 },
  });
  seed.log_entries.push({
    id: seedId(`${k}:log:audit`),
    organization_id: orgId,
    at: AUDIT_AT,
    actor: "adsweet",
    kind: "audit",
    what: "Dagelijkse audit klaar.",
  });
  if (!opts.agencyParentId) {
    seed.credits_ledger.push({
      id: seedId(`${k}:cr:trial`),
      organization_id: orgId,
      delta: 50,
      reason: "proefperiode",
      created_at: at("2026-12-07", "00:00"),
    });
  }
  return orgId;
}

// ---------------------------------------------------------------------------
// Bram · drie webshops · Scale
// ---------------------------------------------------------------------------

export const BRAM_ACCOUNTS = [
  {
    key: "veld",
    name: "Veld & Vuur",
    margin: 0.35,
    aov: 84,
    spend: 420,
    sales: 18,
    revenue: 1512,
    status: "ok" as const,
  },
  {
    key: "trap",
    name: "Trapkracht",
    margin: 0.45,
    aov: 61,
    spend: 280,
    sales: 9,
    revenue: 549,
    status: "warn" as const,
  },
  {
    key: "proef",
    name: "Proefshop",
    margin: 0.5,
    aov: 45,
    spend: 140,
    sales: 2,
    revenue: 90,
    status: "act" as const,
    note: "de nieuwe productlijn",
  },
];

type BramAccount = (typeof BRAM_ACCOUNTS)[number];

function addBramAccount(seed: Seed, k: string, orgId: string, acc: BramAccount, sort: number, runId: string) {
  const accId = seedId(`${k}:account:${acc.key}`);
  seed.ad_accounts.push({
    id: accId,
    organization_id: orgId,
    name: acc.name,
    currency: "EUR",
    status: "actief",
    sort,
  });
  seed.goals.push({
    id: seedId(`${k}:goal:${acc.key}`),
    organization_id: orgId,
    ad_account_id: accId,
    type: "verkopen",
    aov: acc.aov,
    margin: acc.margin,
    targeting: {},
  });
  seed.connections.push({
    id: seedId(`${k}:conn:meta:${acc.key}`),
    organization_id: orgId,
    ad_account_id: accId,
    provider: "meta",
    status: "gekoppeld",
    connected_at: at("2026-10-01", "10:00"),
    page_name: acc.name,
    pixel_name: `${acc.name} pixel`,
    pixel_ok: true,
  });
  const campId = seedId(`${k}:camp:${acc.key}`);
  seed.campaigns.push({
    id: campId,
    organization_id: orgId,
    ad_account_id: accId,
    name: `${acc.name} · Vast · Verkopen`,
    kind: "vast",
    goal: "verkopen",
    status: "actief",
    daily_budget: null,
    start_date: null,
    utm: { source: "meta", medium: "paid_social" },
  });
  const sales = spreadInt(acc.sales, 7);
  addDaily(seed, { organization_id: orgId, campaign_id: campId, ad_id: null }, dateRange(LAST7_FROM, 7), {
    spend: spreadMoney(acc.spend, 7),
    purchases: sales,
    revenue: sales.map((s) => s * acc.aov),
  });
  const be = 1 / acc.margin;
  const roas = acc.revenue / acc.spend;
  const base = {
    organization_id: orgId,
    audit_run_id: runId,
    ad_account_id: accId,
    status: "open" as const,
    created_at: AUDIT_AT,
  };
  if (acc.status === "act")
    seed.recommendations.push({
      ...base,
      id: seedId(`${k}:rec:${acc.key}`),
      type: "account_onder_break_even",
      severity: "act",
      sort: 1,
      payload: {
        account: acc.name,
        spend: acc.spend,
        revenue: acc.revenue,
        sales: acc.sales,
        roas: round2(roas),
        break_even: round2(be),
        margin: acc.margin,
        note: acc.note ?? null,
      },
    });
  if (acc.status === "warn")
    seed.recommendations.push({
      ...base,
      id: seedId(`${k}:rec:${acc.key}`),
      type: "account_onder_break_even",
      severity: "warn",
      sort: 2,
      payload: {
        account: acc.name,
        spend: acc.spend,
        revenue: acc.revenue,
        sales: acc.sales,
        roas: round2(roas),
        break_even: round2(be),
        margin: acc.margin,
      },
    });
  if (acc.status === "ok")
    seed.recommendations.push({
      ...base,
      id: seedId(`${k}:rec:${acc.key}`),
      type: "account_schalen",
      severity: "info",
      sort: 3,
      payload: { account: acc.name, roas: round2(roas), break_even: round2(be), step: 0.2 },
    });
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildBram(seed: Seed, opts: ScenarioOptions) {
  const k = opts.key;
  const orgId = seedId(`${k}:org`);
  seed.organizations.push({
    id: orgId,
    name: "Veld & Vuur",
    kind: "webshop",
    plan: "scale",
    billing_period: "maandelijks",
    subscription_status: "actief",
    founding: false,
    color: "roos",
    onboarding_step: 11,
    onboarding_done: true,
    tuning_step: 1,
    naming: NAMING("Veld & Vuur"),
    created_at: at("2026-10-01", "09:00"),
  });
  addOwner(seed, opts, orgId);
  addExampleNotes(seed, opts.key, orgId);
  seed.business_profiles.push({ organization_id: orgId, sells: "Drie webshops" });
  seed.autopilot_settings.push({ organization_id: orgId, mode: "vraag", limits: {} });
  const runId = seedId(`${k}:audit:20261207`);
  seed.audit_runs.push({
    id: runId,
    organization_id: orgId,
    ran_at: AUDIT_AT,
    playbook_version: "1.0",
    summary: { proposals: 3 },
  });
  BRAM_ACCOUNTS.forEach((acc, i) => addBramAccount(seed, k, orgId, acc, i, runId));
  seed.log_entries.push({
    id: seedId(`${k}:log:audit`),
    organization_id: orgId,
    at: AUDIT_AT,
    actor: "adsweet",
    kind: "audit",
    what: "Dagelijkse audit klaar.",
  });
  seed.credits_ledger.push(
    {
      id: seedId(`${k}:cr:maand`),
      organization_id: orgId,
      delta: 600,
      reason: "maand",
      created_at: at("2026-12-01", "00:00"),
    },
    {
      id: seedId(`${k}:cr:gebruik`),
      organization_id: orgId,
      delta: -210,
      reason: "ai_gebruik",
      created_at: at("2026-12-06", "18:00"),
    },
  );
  return orgId;
}

/** Eén webshop van Bram als aparte klant van een bureau. */
function buildBramClient(seed: Seed, opts: ScenarioOptions, acc: BramAccount) {
  const k = opts.key;
  const orgId = seedId(`${k}:org`);
  seed.organizations.push({
    id: orgId,
    name: acc.name,
    kind: "webshop",
    color: "roos",
    onboarding_step: 11,
    onboarding_done: true,
    tuning_step: 1,
    naming: NAMING(acc.name),
    created_at: at("2026-10-01", "09:00"),
    ...orgBase(opts),
  });
  seed.business_profiles.push({ organization_id: orgId });
  addExampleNotes(seed, k, orgId);
  seed.autopilot_settings.push({ organization_id: orgId, mode: "vraag", limits: {} });
  const runId = seedId(`${k}:audit:20261207`);
  seed.audit_runs.push({
    id: runId,
    organization_id: orgId,
    ran_at: AUDIT_AT,
    playbook_version: "1.0",
    summary: { proposals: 1 },
  });
  addBramAccount(seed, k, orgId, acc, 0, runId);
  return orgId;
}

// ---------------------------------------------------------------------------
// Eva · Bureau Kompas · Agency · 6 klanten
// ---------------------------------------------------------------------------

export function buildEva(seed: Seed) {
  const k = "eva";
  const orgId = seedId(`${k}:org`);
  seed.organizations.push({
    id: orgId,
    name: "Bureau Kompas",
    kind: "bureau",
    plan: "agency",
    billing_period: "maandelijks",
    subscription_status: "actief",
    founding: false,
    color: "lavendel",
    onboarding_step: 11,
    onboarding_done: true,
    tuning_step: 1,
    naming: NAMING("Kompas"),
    created_at: at("2026-09-01", "09:00"),
  });
  addOwner(seed, { key: k, owner: "eva" }, orgId);
  addUser(seed, "kompasTeam");
  seed.members.push({ id: seedId(`${k}:member:kompasTeam`), user_id: userId("kompasTeam"), organization_id: orgId, role: "beheerder", ad_account_ids: null });
  addExampleNotes(seed, k, orgId);
  seed.autopilot_settings.push({ organization_id: orgId, mode: "vraag", limits: {} });

  // Wie volgt op: Eva of [teamlid] (plaatshouder, geen naam verzinnen).
  let index = 0;
  const client = (key: string, owner: DemoUserKey | null) => ({
    key: `kompas:${key}`,
    agencyParentId: orgId,
    agencyOwner: owner,
    clientIndex: index++,
  });
  buildLisa(seed, client("lisa", "eva"));
  buildTom(seed, client("tom", "eva"));
  buildSarah(seed, client("sarah", null));
  buildBramClient(seed, client("veld", null), BRAM_ACCOUNTS[0]);
  buildBramClient(seed, client("trap", null), BRAM_ACCOUNTS[1]);
  buildBramClient(seed, client("proef", "eva"), BRAM_ACCOUNTS[2]);
  return orgId;
}

export function buildSeed(): Seed {
  const seed = emptySeed();
  buildLisa(seed, { key: "lisa", owner: "lisa" });
  buildTom(seed, { key: "tom", owner: "tom" });
  buildSarah(seed, { key: "sarah", owner: "sarah" });
  buildBram(seed, { key: "bram", owner: "bram" });
  buildEva(seed);
  addUser(seed, "beheer");
  seed.adsweet_admins.push({ user_id: userId("beheer") });

  // Demo: Lisa nodigt een teamlid uit (Inloggen.dc.html#uitnodiging). Werkt met de link /uitnodiging/demo-noor-teamlid.
  seed.invitations.push({
    id: seedId("lisa:invitation:team"),
    organization_id: ORG_IDS.lisa,
    email: "teamlid@ateliernoor.voorbeeld",
    role: "beheerder",
    token: "demo-noor-teamlid",
    invited_by: userId("lisa"),
    expires_at: at("2026-12-21", "23:59"),
    created_at: at("2026-12-07", "08:30"),
  });
  // De voorbeeldgebruikers kennen de app al: hun rondleidingen zijn gezien. Een nieuwe gebruiker krijgt ze de eerste keer.
  for (const key of ["lisa", "tom", "sarah", "bram", "eva", "kompasTeam"] as const)
    for (const tour of ["app", "campagne", "wizard"] as const) seed.user_tours.push({ user_id: userId(key), tour, seen_at: at("2026-11-20", "09:00") });
  // Academy: wat Lisa en Tom al lazen (App.dc.html#academy: 2 van De basis, 1 van het playbook, 1 van AdSweet gebruiken).
  for (const key of ["lisa", "tom"] as const)
    for (const lesson of ["basis-1", "basis-2", "playbook-1", "gebruiken-1"])
      seed.academy_progress.push({ user_id: userId(key), lesson, done_at: at("2026-11-24", "20:00") });
  // Calls (Beheer.dc.html#calls): Lisa vroeg een onboardinggesprek, Bram een kwartaalcall. Het moment is nog te plannen.
  seed.calls.push(
    { id: seedId("lisa:call:onboarding"), organization_id: ORG_IDS.lisa, kind: "onboarding", status: "te_plannen", created_at: at("2026-11-17", "10:00") },
    { id: seedId("bram:call:kwartaal"), organization_id: ORG_IDS.bram, kind: "kwartaal", status: "te_plannen", created_at: at("2026-12-01", "09:00") },
  );
  // Founding members: −30% zolang ze klant blijven, voor de eerste 50 (docs/regels.md).
  seed.discount_codes.push({ id: seedId("discount:founding"), code: "FOUNDING50", kind: "founding", percent_off: 30, max_uses: 50, uses: 1 });
  return seed;
}

export const ORG_IDS = {
  lisa: seedId("lisa:org"),
  tom: seedId("tom:org"),
  sarah: seedId("sarah:org"),
  bram: seedId("bram:org"),
  eva: seedId("eva:org"),
} as const;
