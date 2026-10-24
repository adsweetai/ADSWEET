// Rijtypes voor de tabellen in supabase/migrations. Met de hand bijgehouden; `pnpm db:types` genereert
// de officiële Supabase-types naast dit bestand (types.generated.ts) zodra er een lokaal project draait.

export type Uuid = string;
export type IsoDate = string; // 2026-12-07
export type IsoDateTime = string; // 2026-12-07T06:00:00+01:00
export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export type Plan = "starter" | "pro" | "scale" | "agency";
export type OrgKind = "webshop" | "dienstverlener" | "lokaal" | "zelfstandige" | "bureau";
export type Role = "eigenaar" | "beheerder" | "lezer";
export type SeriesColor = "tarwe" | "staal" | "lavendel" | "salie" | "klei" | "roos";
export type SubscriptionStatus = "proef" | "actief" | "mislukt" | "opgezegd" | "verlopen";
export type Severity = "act" | "warn" | "info";
export type AdLabel = "winnaar" | "geen" | "verliezer" | "vroeg" | "rapport";
export type FunnelPhase = "top" | "middle" | "bottom";

export interface Organization {
  id: Uuid;
  name: string;
  kind: OrgKind;
  plan: Plan;
  billing_period: "maandelijks" | "jaarlijks";
  subscription_status: SubscriptionStatus;
  trial_started_at: IsoDate | null;
  trial_ends_at: IsoDate | null;
  cancel_at: IsoDate | null;
  founding: boolean;
  discount_code: string | null;
  agency_parent_id: Uuid | null;
  agency_owner_user_id: Uuid | null;
  color: SeriesColor;
  billing_name: string | null;
  billing_vat: string | null;
  billing_address: string | null;
  billing_email: string | null;
  onboarding_step: number;
  onboarding_done: boolean;
  tuning_step: number;
  naming: Json;
  created_at: IsoDateTime;
}

export interface Profile {
  user_id: Uuid;
  email: string;
  first_name: string | null;
  full_name: string | null;
  locale: "nl" | "fr" | "en";
  theme: "auto" | "light" | "dark";
  timezone: string;
  last_seen_at: IsoDateTime | null;
  created_at: IsoDateTime;
}

export interface AdsweetAdmin {
  user_id: Uuid;
  created_at: IsoDateTime;
}

export interface Member {
  id: Uuid;
  user_id: Uuid;
  organization_id: Uuid;
  role: Role;
  ad_account_ids: Uuid[] | null;
  created_at: IsoDateTime;
}

export interface Invitation {
  id: Uuid;
  organization_id: Uuid;
  email: string;
  role: Role;
  ad_account_ids: Uuid[] | null;
  token: string;
  invited_by: Uuid | null;
  expires_at: IsoDateTime;
  accepted_at: IsoDateTime | null;
  created_at: IsoDateTime;
}

export interface AdAccount {
  id: Uuid;
  organization_id: Uuid;
  name: string;
  meta_ad_account_id: string | null;
  currency: string;
  timezone: string;
  status: "actief" | "betaalprobleem" | "koppeling_verlopen" | "uitgeschakeld";
  payment_method_ok: boolean;
  channel: "meta" | "google";
  sort: number;
  created_at: IsoDateTime;
}

export interface Offer {
  name: string;
  price: string;
}

export interface BusinessProfile {
  organization_id: Uuid;
  website: string | null;
  sells: string | null;
  offers: Offer[];
  audience: string | null;
  tone: string[];
  tone_example: string | null;
  region: string | null;
  colors: string[];
  font: string | null;
  logo_path: string | null;
  never_say: string | null;
  differentiator: string | null;
  best_customers: string | null;
  competitors: string[];
  contact: Json;
  payer: string | null;
  beneficiary: string | null;
  updated_at: IsoDateTime;
}

export interface Targeting {
  area?: "radius" | "prov" | "land";
  region?: string;
  radius_km?: number;
  countries?: string[];
  languages?: string[];
  age_min?: number;
  age_max?: number | null; // null = 65+
}

export interface Goal {
  id: Uuid;
  organization_id: Uuid;
  ad_account_id: Uuid | null;
  type: "verkopen" | "aanvragen" | "zaak" | "anders";
  zaak_mode: "aanvragen" | "bekendheid" | null;
  aov: number | null;
  margin: number | null;
  target_roas: number | null;
  target_cpl: number | null;
  clv: number | null;
  close_rate: number | null;
  targeting: Targeting;
  special_category: boolean;
  updated_at: IsoDateTime;
}

export interface DocumentRow {
  id: Uuid;
  organization_id: Uuid;
  category: "prijs" | "reviews" | "resultaten" | "anders" | "brandguide";
  name: string;
  storage_path: string;
  status: "nieuw" | "gelezen" | "fout";
  extracted: Json;
  created_at: IsoDateTime;
}

export interface Media {
  id: Uuid;
  organization_id: Uuid;
  name: string | null;
  storage_path: string | null;
  kind: "foto" | "video";
  source: "website" | "upload" | "drive" | "dropbox" | "canva" | "figma" | "studio";
  width: number | null;
  height: number | null;
  duration_s: number | null;
  used_in: Uuid[];
  created_at: IsoDateTime;
}

export type Provider =
  | "meta"
  | "google_ads"
  | "shopify"
  | "google_analytics"
  | "google_drive"
  | "dropbox"
  | "canva"
  | "figma"
  | "slack";

export interface Connection {
  id: Uuid;
  organization_id: Uuid;
  ad_account_id: Uuid | null;
  provider: Provider;
  status: "gekoppeld" | "verlopen" | "los" | "fout";
  connected_at: IsoDateTime | null;
  expires_at: IsoDateTime | null;
  vault_secret_id: Uuid | null;
  meta_ad_account_id: string | null;
  page_id: string | null;
  page_name: string | null;
  ig_id: string | null;
  ig_name: string | null;
  pixel_id: string | null;
  pixel_name: string | null;
  pixel_ok: boolean | null;
  details: Json;
  created_at: IsoDateTime;
}

export type CampaignKind = "vast" | "solden" | "bf" | "feest" | "event" | "nieuw" | "catalogus";
export type CampaignGoal = "verkopen" | "aanvragen" | "volgers" | "bereik" | "evenement";
export type CampaignStatus = "concept" | "actief" | "leerfase" | "gepland" | "gepauzeerd" | "afgelopen";

export interface Utm {
  source?: string;
  medium?: string;
  campaign?: string;
}

export interface Campaign {
  id: Uuid;
  organization_id: Uuid;
  ad_account_id: Uuid | null;
  meta_id: string | null;
  name: string;
  kind: CampaignKind;
  goal: CampaignGoal;
  channel: "meta" | "google";
  status: CampaignStatus;
  daily_budget: number | null;
  budget_level: "campagne" | "adset";
  start_date: IsoDate | null;
  end_date: IsoDate | null;
  outside_adsweet: boolean;
  deviations: string[];
  targeting: Targeting;
  placements: string;
  extras_off: boolean;
  payer: string | null;
  beneficiary: string | null;
  utm: Utm;
  created_by: Uuid | null;
  launched_at: IsoDateTime | null;
  created_at: IsoDateTime;
}

export interface AdSet {
  id: Uuid;
  organization_id: Uuid;
  campaign_id: Uuid;
  meta_id: string | null;
  name: string;
  reason: string | null;
  start_date: IsoDate | null;
  learning: boolean;
  locked: boolean;
  daily_budget: number | null;
  status: "concept" | "actief" | "gepauzeerd" | "afgelopen";
  created_at: IsoDateTime;
}

export interface AdExtras {
  muziek: boolean;
  tekst_op_beeld: boolean;
  beelduitbreiding: boolean;
  varianten: boolean;
}

export interface Ad {
  id: Uuid;
  organization_id: Uuid;
  campaign_id: Uuid;
  ad_set_id: Uuid;
  media_id: Uuid | null;
  meta_id: string | null;
  code: string;
  name: string;
  kind: "foto" | "video";
  phase: FunnelPhase;
  primary_text: string | null;
  headline: string | null;
  description: string | null;
  cta: string | null;
  variants: { primary_text?: string[]; headline?: string[]; description?: string[] };
  extras: AdExtras;
  label: AdLabel | null;
  status: "concept" | "in_review" | "actief" | "uit" | "afgekeurd";
  review_status: "goedgekeurd" | "wordt_nagekeken" | "afgekeurd";
  started_at: IsoDate | null;
  created_at: IsoDateTime;
}

export interface InsightDaily {
  id: number;
  organization_id: Uuid;
  campaign_id: Uuid;
  ad_id: Uuid | null;
  date: IsoDate;
  spend: number;
  impressions: number | null;
  reach: number | null;
  clicks: number | null;
  link_clicks: number | null;
  lpv: number | null;
  view_content: number | null;
  add_to_cart: number | null;
  checkout: number | null;
  purchases: number | null;
  revenue: number | null;
  leads: number | null;
  followers: number | null;
  video_3s: number | null;
  video_thruplay: number | null;
}

export interface PlaybookVersion {
  id: Uuid;
  version: string;
  status: "concept" | "gepubliceerd" | "gearchiveerd";
  rules: Json;
  note: string | null;
  created_by: Uuid | null;
  published_at: IsoDateTime | null;
  created_at: IsoDateTime;
}

export interface AuditRun {
  id: Uuid;
  organization_id: Uuid;
  ran_at: IsoDateTime;
  score: number | null;
  playbook_version: string | null;
  summary: Json;
}

export type RecommendationStatus = "wacht" | "open" | "gedaan" | "later" | "zo-laten";

export interface Recommendation {
  id: Uuid;
  organization_id: Uuid;
  audit_run_id: Uuid | null;
  ad_account_id: Uuid | null;
  campaign_id: Uuid | null;
  ad_id: Uuid | null;
  parent_id: Uuid | null;
  type: string;
  severity: Severity;
  payload: Record<string, Json>;
  sort: number;
  status: RecommendationStatus;
  snoozed_until: IsoDate | null;
  decided_by: Uuid | null;
  decided_at: IsoDateTime | null;
  created_at: IsoDateTime;
}

export type LogActor = "user" | "autopilot" | "outside" | "adsweet" | "assistant";

export interface LogEntry {
  id: Uuid;
  organization_id: Uuid;
  campaign_id: Uuid | null;
  at: IsoDateTime;
  time_known: boolean;
  actor: LogActor;
  actor_name: string | null;
  user_id: Uuid | null;
  kind: "wijziging" | "budget" | "advertentie" | "extra" | "campagne" | "audit";
  what: string;
  from_to: string | null;
  undo: Json | null;
  undone_at: IsoDateTime | null;
}

export interface NotificationRow {
  id: Uuid;
  organization_id: Uuid;
  type: string;
  severity: "act" | "warn" | "ok";
  payload: Record<string, Json>;
  href: string | null;
  created_at: IsoDateTime;
  read_at: IsoDateTime | null;
  emailed_at: IsoDateTime | null;
}

export interface NotificationSetting {
  organization_id: Uuid;
  user_id: Uuid;
  type: string;
  in_app: boolean;
  email: boolean;
}

export interface AutopilotSettings {
  organization_id: Uuid;
  mode: "uit" | "vraag" | "grenzen";
  limits: Json;
  updated_at: IsoDateTime;
}

export interface Rule {
  id: Uuid;
  organization_id: Uuid;
  metric: string;
  comparator: string;
  value: number | null;
  window: string;
  action: "melding" | "budget" | "starten" | "stoppen" | "voorstel_afzetten";
  action_value: string | null;
  active: boolean;
  created_at: IsoDateTime;
}

export interface AssistantThread {
  id: Uuid;
  organization_id: Uuid;
  user_id: Uuid;
  title: string | null;
  created_at: IsoDateTime;
}

export interface AssistantMessage {
  id: Uuid;
  thread_id: Uuid;
  organization_id: Uuid;
  role: "user" | "assistant";
  content: string;
  tool_calls: Json | null;
  pending_change: Json | null;
  created_at: IsoDateTime;
}

export interface CreditsLedger {
  id: Uuid;
  organization_id: Uuid;
  delta: number;
  reason: string;
  model: string | null;
  cost_eur: number | null;
  created_at: IsoDateTime;
}

export interface UserTour {
  user_id: Uuid;
  tour: "app" | "campagne" | "wizard";
  seen_at: IsoDateTime;
}

export interface AcademyProgress {
  user_id: Uuid;
  lesson: string;
  done_at: IsoDateTime;
}

export interface Invoice {
  id: Uuid;
  organization_id: Uuid;
  number: string;
  issued_at: IsoDate;
  amount_excl: number;
  vat: number;
  status: "open" | "betaald" | "mislukt";
  pdf_path: string | null;
  created_at: IsoDateTime;
}

export interface DiscountCode {
  id: Uuid;
  code: string;
  kind: "founding" | "doorverwijzing" | "partner";
  percent_off: number | null;
  months_free: number | null;
  max_uses: number | null;
  uses: number;
  active: boolean;
  created_at: IsoDateTime;
}

export interface Referral {
  id: Uuid;
  organization_id: Uuid;
  code: string;
  referred_name: string | null;
  signed_up_at: IsoDate | null;
  free_month_from: IsoDate | null;
  created_at: IsoDateTime;
}

export interface Partner {
  id: Uuid;
  name: string;
  company: string | null;
  email: string;
  website: string | null;
  what: string | null;
  status: "aanmelding" | "actief" | "gestopt";
  code: string | null;
  created_at: IsoDateTime;
}

export interface Call {
  id: Uuid;
  organization_id: Uuid;
  kind: "onboarding" | "kwartaal";
  starts_at: IsoDateTime | null;
  status: "te_plannen" | "gepland" | "gedaan";
  created_at: IsoDateTime;
}

export interface WaitlistEntry {
  id: Uuid;
  name: string;
  email: string;
  website: string | null;
  created_at: IsoDateTime;
}

export interface Tables {
  organizations: Organization;
  profiles: Profile;
  adsweet_admins: AdsweetAdmin;
  members: Member;
  invitations: Invitation;
  ad_accounts: AdAccount;
  business_profiles: BusinessProfile;
  goals: Goal;
  documents: DocumentRow;
  media: Media;
  connections: Connection;
  campaigns: Campaign;
  ad_sets: AdSet;
  ads: Ad;
  insights_daily: InsightDaily;
  playbook_versions: PlaybookVersion;
  audit_runs: AuditRun;
  recommendations: Recommendation;
  log_entries: LogEntry;
  notifications: NotificationRow;
  notification_settings: NotificationSetting;
  autopilot_settings: AutopilotSettings;
  rules: Rule;
  assistant_threads: AssistantThread;
  assistant_messages: AssistantMessage;
  credits_ledger: CreditsLedger;
  user_tours: UserTour;
  academy_progress: AcademyProgress;
  invoices: Invoice;
  discount_codes: DiscountCode;
  referrals: Referral;
  partners: Partner;
  calls: Call;
  waitlist: WaitlistEntry;
}

export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T];
