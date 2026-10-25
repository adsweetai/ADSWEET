import "server-only";
import { revalidatePath } from "next/cache";
import { must } from "@adsweet/db";
import { nowIso } from "@/lib/clock";
import { isDemo } from "@/lib/env";
import { serviceDb } from "../auth";
import { assertCanEdit, getContext } from "../context";
import { listMetaAccounts, listMetaPages, listMetaPixels, type MetaAccountOption, type MetaPageOption, type MetaPixelOption } from "./assets";
import { metaConfigured, withMetaToken } from "./graph";
import { oauthReady } from "./oauth";
import { syncMetaAccount, type SyncResult } from "./sync";
import { userMetaToken } from "./tokens";

// Een organisatie aan een advertentieaccount, pagina en pixel uit Meta hangen (onboarding stap 6, Instellingen ›
// Koppelingen, een nieuwe klant van een bureau). Daarna halen we meteen de laatste 30 dagen op. We kijken met de
// sleutel van wie met Facebook koppelde; zonder die sleutel met die van de systeemgebruiker.

export interface MetaStatus {
  /** Er is een sleutel om accounts te kiezen: je eigen Facebook-koppeling of die van de systeemgebruiker. */
  live: boolean;
  /** "Doorgaan met Facebook" kan: de Meta-app is ingesteld. */
  connect: boolean;
}

export async function metaStatus(userId: string): Promise<MetaStatus> {
  if (isDemo) return { live: false, connect: false };
  const own = !!(await userMetaToken(userId));
  return { live: own || metaConfigured(), connect: oauthReady() };
}

/** Waar "Doorgaan met Facebook" voor de koppeling begint. */
export const metaConnectHref = (next: string) => `/auth/meta?next=${encodeURIComponent(next)}`;

export interface MetaChoices {
  accounts: MetaAccountOption[];
  pages: MetaPageOption[];
}

export async function metaChoices(): Promise<MetaChoices> {
  const ctx = await getContext();
  assertCanEdit(ctx);
  return withMetaToken(await userMetaToken(ctx.user.id), async () => {
    const [accounts, pages] = await Promise.all([listMetaAccounts(), listMetaPages()]);
    return { accounts, pages };
  });
}

export async function metaPixels(accountId: string): Promise<MetaPixelOption[]> {
  const ctx = await getContext();
  assertCanEdit(ctx);
  return withMetaToken(await userMetaToken(ctx.user.id), () => listMetaPixels(accountId));
}

export type ConnectResult = { ok: true; sync: SyncResult | null; syncError?: string } | { ok: false; error: "account" | "meta" };

const EXISTING_KEY = "bestaande_campagnes";

export async function connectMeta(sel: { accountId: string; pageId: string | null; pixelId: string | null }): Promise<ConnectResult> {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const token = await userMetaToken(ctx.user.id);
  let accounts: MetaAccountOption[];
  let pages: MetaPageOption[];
  try {
    [accounts, pages] = await withMetaToken(token, () => Promise.all([listMetaAccounts(), listMetaPages()]));
  } catch {
    return { ok: false, error: "meta" };
  }
  // Alleen een account dat de sleutel echt mag zien.
  const account = accounts.find((a) => a.id === sel.accountId);
  if (!account) return { ok: false, error: "account" };
  const page = pages.find((p) => p.id === sel.pageId) ?? null;
  const pixel = sel.pixelId ? ((await withMetaToken(token, () => listMetaPixels(account.id))).find((p) => p.id === sel.pixelId) ?? null) : null;

  const svc = serviceDb();
  const org = ctx.org;
  const mine = must(await svc.from("ad_accounts").select().eq("organization_id", org.id).order("sort"));
  const reuse = mine.find((a) => a.meta_ad_account_id === account.id) ?? mine.find((a) => !a.meta_ad_account_id || !/^act_\d+$/.test(a.meta_ad_account_id));
  const accRow = {
    name: account.name,
    meta_ad_account_id: account.id,
    currency: account.currency,
    status: account.status,
    payment_method_ok: account.status !== "betaalprobleem",
    channel: "meta" as const,
  };
  const acc = reuse
    ? must(await svc.from("ad_accounts").update(accRow).eq("id", reuse.id).select().single())
    : must(
        await svc
          .from("ad_accounts")
          .insert({ organization_id: org.id, sort: mine.length, ...accRow })
          .select()
          .single(),
      );

  const existing = must(await svc.from("connections").select("id, details").eq("organization_id", org.id).eq("provider", "meta").maybeSingle());
  const conn = {
    organization_id: org.id,
    ad_account_id: acc.id,
    provider: "meta" as const,
    status: "gekoppeld" as const,
    connected_at: nowIso(),
    meta_ad_account_id: account.id,
    page_id: page?.id ?? null,
    page_name: page?.name ?? null,
    ig_id: page?.ig?.id ?? null,
    ig_name: page?.ig?.username ? `@${page.ig.username}` : null,
    pixel_id: pixel?.id ?? null,
    pixel_name: pixel?.name ?? null,
    pixel_ok: pixel?.ok ?? false,
    // De cijfers komen voortaan met de sleutel van wie koppelde (ook 's nachts).
    meta_token_user: token ? ctx.user.id : null,
  };
  let sync: SyncResult | null = null;
  let syncError: string | undefined;
  if (existing) await svc.from("connections").update(conn).eq("id", existing.id);
  else await svc.from("connections").insert({ ...conn, details: {} });
  try {
    sync = await syncMetaAccount(org.id, acc.id, 30);
  } catch (e) {
    syncError = (e as Error).message;
    console.warn(`Eerste Meta-sync mislukt: ${syncError}`);
  }
  // Onboarding stap 7 verschijnt alleen als er al campagnes bestonden.
  const campaigns = must(await svc.from("campaigns").select("id").eq("organization_id", org.id).eq("outside_adsweet", true));
  const fresh = must(await svc.from("connections").select("id, details").eq("organization_id", org.id).eq("provider", "meta").single());
  await svc
    .from("connections")
    .update({ details: { ...((fresh.details ?? {}) as Record<string, unknown>), [EXISTING_KEY]: campaigns.length > 0 } as never })
    .eq("id", fresh.id);
  revalidatePath("/", "layout");
  return { ok: true, sync, syncError };
}

/** Instellingen › Koppelingen: de cijfers nu ophalen. */
export async function syncNow(): Promise<{ ok: boolean; result?: SyncResult; error?: string }> {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const acc = ctx.account;
  if (!acc?.meta_ad_account_id || !/^act_\d+$/.test(acc.meta_ad_account_id)) return { ok: false, error: "Geen Meta-account gekoppeld." };
  try {
    const result = await syncMetaAccount(ctx.org.id, acc.id, 30);
    revalidatePath("/", "layout");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
