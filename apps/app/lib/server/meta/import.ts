import "server-only";
import { getTranslations } from "next-intl/server";
import { must, type OrgKind } from "@adsweet/db";
import { nowIso } from "@/lib/clock";
import { AGENCY_SLOTS, KIND_COLOR } from "../agency";
import { getDb, serviceDb } from "../auth";
import { writeLog } from "../changes";
import { goalTypeForKind } from "../metrics";
import { assertCanEdit, getContext, type AppContext } from "../context";
import { listMetaAccounts, type MetaAccountOption } from "./assets";
import { withMetaToken } from "./graph";
import { syncMetaAccount, type SyncResult } from "./sync";
import { userMetaToken } from "./tokens";

// Bureau: advertentieaccounts uit Meta in één keer als klanten toevoegen. Elke klant krijgt een eigen werkruimte in het
// Agency-plan van het bureau, met dat advertentieaccount gekoppeld. De cijfers halen we daarna per klant op (één
// verzoek per klant, zodat geen enkel verzoek te lang duurt).

export interface ImportChoice extends MetaAccountOption {
  /** Al een klant (of het bureau zelf). */
  taken: boolean;
}

async function agencyContext(): Promise<AppContext & { agency: NonNullable<AppContext["agency"]> }> {
  const ctx = await getContext();
  assertCanEdit(ctx);
  if (!ctx.agency || ctx.inClient) throw new Error("Alleen voor een bureau.");
  return ctx as AppContext & { agency: NonNullable<AppContext["agency"]> };
}

/** Alle klanten van het bureau (ook die dit teamlid niet ziet) en de advertentieaccounts die al gekoppeld zijn. */
async function agencyState(agencyId: string): Promise<{ clients: number; linked: Set<string> }> {
  const svc = serviceDb();
  const clients = must(await svc.from("organizations").select("id").eq("agency_parent_id", agencyId));
  const accounts = must(
    await svc
      .from("ad_accounts")
      .select("meta_ad_account_id")
      .in("organization_id", [agencyId, ...clients.map((c) => c.id)]),
  );
  return { clients: clients.length, linked: new Set(accounts.map((a) => a.meta_ad_account_id).filter((x): x is string => !!x)) };
}

export async function importChoices(): Promise<{ accounts: ImportChoice[]; free: number }> {
  const ctx = await agencyContext();
  const accounts = await withMetaToken(await userMetaToken(ctx.user.id), () => listMetaAccounts());
  const state = await agencyState(ctx.agency.id);
  return { accounts: accounts.map((a) => ({ ...a, taken: state.linked.has(a.id) })), free: Math.max(0, AGENCY_SLOTS - state.clients) };
}

export type ImportResult = { ok: true; created: { id: string; name: string }[] } | { ok: false; error: "meta" | "slots" | "none" };

/**
 * Maakt voor elk gekozen account een klant aan: werkruimte (Agency, actief, onboarding klaar want het bureau richtte ze
 * in), advertentieaccount en koppeling met Meta. Alleen accounts die de sleutel echt ziet en die nog geen klant zijn.
 */
export async function addClientsFromMeta(
  agencyId: string,
  userId: string,
  accounts: MetaAccountOption[],
  chosen: string[],
  tokenUser: string | null,
  kind: OrgKind = "zelfstandige",
): Promise<ImportResult> {
  const state = await agencyState(agencyId);
  const wanted = accounts.filter((a) => chosen.includes(a.id) && !state.linked.has(a.id));
  if (!wanted.length) return { ok: false, error: "none" };
  if (state.clients + wanted.length > AGENCY_SLOTS) return { ok: false, error: "slots" };
  const svc = serviceDb();
  const created: { id: string; name: string }[] = [];
  for (const a of wanted) {
    const name = a.name.trim().slice(0, 120) || a.id;
    const org = must(
      await svc
        .from("organizations")
        .insert({
          name,
          kind,
          plan: "agency",
          subscription_status: "actief",
          agency_parent_id: agencyId,
          agency_owner_user_id: userId,
          color: KIND_COLOR[kind],
          onboarding_step: 1,
          onboarding_done: true,
          tuning_step: 1,
          naming: { short: name.split(/[,|·]/)[0].trim(), utm_source: "meta", utm_medium: "paid_social" },
        })
        .select()
        .single(),
    );
    await svc.from("business_profiles").insert({ organization_id: org.id });
    // Het doel dat bij de soort zaak hoort (een webshop: verkopen), zodat Vandaag meteen de juiste cijfers toont.
    const type = goalTypeForKind(kind);
    if (type) await svc.from("goals").insert({ organization_id: org.id, type });
    const acc = must(
      await svc
        .from("ad_accounts")
        .insert({
          organization_id: org.id,
          sort: 0,
          name,
          meta_ad_account_id: a.id,
          currency: a.currency,
          status: a.status,
          payment_method_ok: a.status !== "betaalprobleem",
          channel: "meta",
        })
        .select()
        .single(),
    );
    await svc.from("connections").insert({
      organization_id: org.id,
      ad_account_id: acc.id,
      provider: "meta",
      status: "gekoppeld",
      connected_at: nowIso(),
      meta_ad_account_id: a.id,
      meta_token_user: tokenUser,
      details: {},
    });
    created.push({ id: org.id, name });
  }
  return { ok: true, created };
}

export async function importClients(chosen: string[], kind: OrgKind): Promise<ImportResult> {
  const ctx = await agencyContext();
  const token = await userMetaToken(ctx.user.id);
  let accounts: MetaAccountOption[];
  try {
    accounts = await withMetaToken(token, () => listMetaAccounts());
  } catch {
    return { ok: false, error: "meta" };
  }
  const k: OrgKind = ["webshop", "dienstverlener", "lokaal", "zelfstandige"].includes(kind) ? kind : "zelfstandige";
  const res = await addClientsFromMeta(ctx.agency.id, ctx.user.id, accounts, chosen, token ? ctx.user.id : null, k);
  if (res.ok) {
    const t = await getTranslations("agency");
    await writeLog(await getDb(), { ...ctx, org: ctx.agency }, { kind: "wijziging", what: t("import.log", { n: res.created.length }) });
  }
  return res;
}

/** De cijfers van de laatste 30 dagen voor één klant van het bureau. */
export async function syncClient(clientId: string): Promise<{ ok: true; result: SyncResult } | { ok: false; error: string }> {
  const ctx = await agencyContext();
  const svc = serviceDb();
  const client = must(await svc.from("organizations").select("id").eq("id", clientId).eq("agency_parent_id", ctx.agency.id).maybeSingle());
  if (!client) return { ok: false, error: "client" };
  const acc = must(await svc.from("ad_accounts").select("id").eq("organization_id", clientId).order("sort").limit(1).maybeSingle());
  if (!acc) return { ok: false, error: "account" };
  try {
    return { ok: true, result: await syncMetaAccount(clientId, acc.id, 30) };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
