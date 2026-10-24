import "server-only";
import { getTranslations } from "next-intl/server";
import { must, type AdExtras, type Db, type Json, type LogEntry, type Recommendation } from "@adsweet/db";
import { formatEuro, formatPercent } from "@adsweet/ui";
import { addDays, nowIso, today } from "@/lib/clock";
import { getDb } from "./auth";
import { assertCanEdit, getContext, type AppContext } from "./context";

// Wijzigingen die de klant met één klik doet. AdSweet voert ze uit op de klik van de klant (nooit zelf),
// zet ze in het logboek en houdt bij hoe ze terug kunnen. In fase 13 gaat elke wijziging ook naar Meta.

type Undo =
  | { kind: "ad_status"; ad_id: string; value: "actief" | "uit"; rec_id?: string }
  | { kind: "budget"; campaign_id: string; value: number | null; rec_id?: string }
  | { kind: "extra"; ad_id: string; extra: keyof AdExtras; value: boolean; rec_id?: string };

async function log(
  db: Db,
  ctx: AppContext,
  row: { what: string; from_to?: string | null; kind: LogEntry["kind"]; campaign_id?: string | null; undo?: Undo | null },
) {
  return must(
    await db
      .from("log_entries")
      .insert({
        organization_id: ctx.org.id,
        campaign_id: row.campaign_id ?? null,
        at: nowIso(),
        actor: "user",
        actor_name: ctx.profile.first_name ?? ctx.user.email,
        user_id: ctx.user.id,
        kind: row.kind,
        what: row.what,
        from_to: row.from_to ?? null,
        undo: (row.undo ?? null) as Json,
      })
      .select()
      .single(),
  );
}

async function setFollowUps(db: Db, rec: Recommendation, from: "wacht" | "open", to: "wacht" | "open") {
  await db.from("recommendations").update({ status: to }).eq("parent_id", rec.id).eq("status", from);
}

export interface ApplyResult {
  ok: boolean;
  logId?: string;
  error?: string;
}

/** Voert het voorstel uit (de 1-klikactie op een actiekaart). */
export async function applyRecommendation(id: string): Promise<ApplyResult> {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const db = await getDb();
  const t = await getTranslations("logbook.entries");
  const rec = must(await db.from("recommendations").select().eq("id", id).maybeSingle());
  if (!rec || rec.organization_id !== ctx.org.id) return { ok: false, error: "niet gevonden" };
  const p = rec.payload;
  let entry: LogEntry | null = null;

  if (rec.type === "verliezer" && rec.ad_id) {
    const ad = must(await db.from("ads").update({ status: "uit" }).eq("id", rec.ad_id).select().single());
    entry = await log(db, ctx, {
      kind: "advertentie",
      campaign_id: ad.campaign_id,
      what: t("adOff", { ad: ad.name }),
      from_to: t("activeOff"),
      undo: { kind: "ad_status", ad_id: ad.id, value: "actief", rec_id: rec.id },
    });
    await setFollowUps(db, rec, "wacht", "open");
  } else if (rec.type === "schalen_na_verliezer" && rec.campaign_id) {
    const from = Number(p.budget_from);
    const to = Number(p.budget_to);
    await db.from("campaigns").update({ daily_budget: to }).eq("id", rec.campaign_id);
    entry = await log(db, ctx, {
      kind: "budget",
      campaign_id: rec.campaign_id,
      what: t("budgetUp"),
      from_to: t("perDay", { from: formatEuro(from), to: formatEuro(to) }),
      undo: { kind: "budget", campaign_id: rec.campaign_id, value: from, rec_id: rec.id },
    });
  } else if (rec.type === "extra_buiten_app" && rec.ad_id) {
    const ad = must(await db.from("ads").select().eq("id", rec.ad_id).single());
    const extra = (String(p.extra ?? "muziek") as keyof AdExtras) ?? "muziek";
    await db
      .from("ads")
      .update({ extras: { ...ad.extras, [extra]: false } })
      .eq("id", ad.id);
    entry = await log(db, ctx, {
      kind: "extra",
      campaign_id: ad.campaign_id,
      what: t("musicOff", { ad: ad.name }),
      from_to: t("onOff"),
      undo: { kind: "extra", ad_id: ad.id, extra, value: true, rec_id: rec.id },
    });
  } else if (rec.type === "account_schalen" && rec.ad_account_id) {
    const step = Number(p.step ?? 0.2);
    const camp = must(await db.from("campaigns").select().eq("ad_account_id", rec.ad_account_id).eq("kind", "vast").maybeSingle());
    const account = String(p.account ?? "");
    if (camp?.daily_budget) {
      const to = Math.round(camp.daily_budget * (1 + step) * 100) / 100;
      await db.from("campaigns").update({ daily_budget: to }).eq("id", camp.id);
      entry = await log(db, ctx, {
        kind: "budget",
        campaign_id: camp.id,
        what: t("budgetAccount", { account, step: formatPercent(step) }),
        from_to: t("perDay", { from: formatEuro(camp.daily_budget), to: formatEuro(to) }),
        undo: { kind: "budget", campaign_id: camp.id, value: camp.daily_budget, rec_id: rec.id },
      });
    } else {
      // Het huidige budget is nog niet gekend ([budget]); de wijziging komt in het logboek als plaatshouder.
      entry = await log(db, ctx, {
        kind: "budget",
        campaign_id: camp?.id ?? null,
        what: t("budgetAccount", { account, step: formatPercent(step) }),
        from_to: t("budgetPlaceholder", { step: formatPercent(step) }),
        undo: camp ? { kind: "budget", campaign_id: camp.id, value: null, rec_id: rec.id } : null,
      });
    }
  } else {
    return { ok: false, error: "geen 1-klikactie" };
  }

  await db.from("recommendations").update({ status: "gedaan", decided_by: ctx.user.id, decided_at: nowIso() }).eq("id", rec.id);
  return { ok: true, logId: entry?.id };
}

/** Later (morgen opnieuw) of Zo laten. Geeft de vorige stand terug voor Ongedaan maken. */
export async function decideRecommendation(id: string, decision: "later" | "zo-laten") {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const db = await getDb();
  const rec = must(await db.from("recommendations").select().eq("id", id).maybeSingle());
  if (!rec || rec.organization_id !== ctx.org.id) return { ok: false as const };
  await db
    .from("recommendations")
    .update({ status: decision, snoozed_until: decision === "later" ? addDays(today(), 1) : null, decided_by: ctx.user.id, decided_at: nowIso() })
    .eq("id", id);
  return { ok: true as const, previous: rec.status };
}

export async function reopenRecommendation(id: string) {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const db = await getDb();
  await db
    .from("recommendations")
    .update({ status: "open", snoozed_until: null, decided_by: null, decided_at: null })
    .eq("id", id)
    .eq("organization_id", ctx.org.id);
}

/** Draait een wijziging uit het logboek terug. */
export async function undoLogEntry(logId: string): Promise<{ ok: boolean; what?: string }> {
  const ctx = await getContext();
  assertCanEdit(ctx);
  const db = await getDb();
  const entry = must(await db.from("log_entries").select().eq("id", logId).maybeSingle());
  if (!entry || entry.organization_id !== ctx.org.id || !entry.undo || entry.undone_at) return { ok: false };
  const u = entry.undo as unknown as Undo;
  if (u.kind === "ad_status") await db.from("ads").update({ status: u.value }).eq("id", u.ad_id);
  if (u.kind === "budget" && u.value !== null) await db.from("campaigns").update({ daily_budget: u.value }).eq("id", u.campaign_id);
  if (u.kind === "extra") {
    const ad = must(await db.from("ads").select().eq("id", u.ad_id).single());
    await db
      .from("ads")
      .update({ extras: { ...ad.extras, [u.extra]: u.value } })
      .eq("id", u.ad_id);
  }
  await db.from("log_entries").update({ undone_at: nowIso() }).eq("id", logId);
  if (u.rec_id) {
    const rec = must(await db.from("recommendations").select().eq("id", u.rec_id).maybeSingle());
    if (rec) {
      await db.from("recommendations").update({ status: "open", decided_by: null, decided_at: null }).eq("id", rec.id);
      await setFollowUps(db, rec, "open", "wacht");
    }
  }
  return { ok: true, what: entry.what };
}
