import "server-only";
import { getTranslations } from "next-intl/server";
import { must, type Json } from "@adsweet/db";
import { costPer, roas } from "@adsweet/playbook";
import { formatEuro, formatRoas } from "@adsweet/ui";
import { addDays, today } from "@/lib/clock";
import { periodRange } from "@/lib/period";
import { getDb } from "./auth";
import { inAccount, isLive } from "./campaigns";
import { writeLog } from "./changes";
import { assertCanEdit, assertPlan, getContext, type AppContext } from "./context";
import { creditsFor } from "./credits";
import { ADS_ORDER, goalFor, goalKind, mainCampaign, sumRows, targets, totalsPerAd } from "./metrics";

// Dot, de assistent (vanaf Pro). Eerst met vaste antwoorden, maar wel uit je eigen cijfers: Dot rekent zoals Vandaag.
// Claude komt erbij in fase 13. Dot doet nooit iets zonder jouw klik en zet nooit zelf een advertentie af.

export type Intent = "week" | "xmas" | "roas" | "which" | "free";

export interface DotMessage {
  from: "me" | "dot";
  text?: string;
  kind?: "bars" | "plan" | "change";
  bars?: { n: string; spend: number; rev: number }[];
  plan?: { rows: [string, string][]; make: string[]; credits: number | null };
  change?: { text: string; fromTo: string; campaignId: string; value: number; warn: boolean; done?: "yes" | "no" };
  buttons?: { label: string; href: string }[];
}

async function data(ctx: AppContext) {
  const db = await getDb();
  const [goals, campaigns, ads, rows] = await Promise.all([
    db.from("goals").select().eq("organization_id", ctx.org.id).then(must),
    db.from("campaigns").select().eq("organization_id", ctx.org.id).then(must),
    db.from("ads").select().eq("organization_id", ctx.org.id).then(must),
    db.from("insights_daily").select().eq("organization_id", ctx.org.id).then(must),
  ]);
  const mine = campaigns.filter((c) => inAccount(ctx, c));
  const goal = goalFor(goals, ctx.account?.id);
  const main = mainCampaign(mine.filter(isLive), goal);
  const kind = goalKind(goal, main);
  const day = today();
  const range = periodRange("7d", day);
  const live = rows.filter((r) => main && r.campaign_id === main.id);
  const week = live.filter((r) => r.date >= range.from && r.date <= range.to);
  const mainAds = ads.filter((a) => main && a.campaign_id === main.id).sort(ADS_ORDER);
  return {
    main,
    goal,
    kind,
    tg: targets(goal),
    week: sumRows(week),
    all: totalsPerAd(live),
    weekPerAd: totalsPerAd(week),
    mainAds,
    firstDay: !!main && main.status === "leerfase" && !!main.start_date && main.start_date >= addDays(day, -1),
  };
}

/** Het antwoord van Dot op een vraag. Vaste antwoorden, berekend uit de cijfers van je account. */
export async function answer(ctx: AppContext, intent: Intent, text: string): Promise<DotMessage[]> {
  const t = await getTranslations("dot.answers");
  const tw = await getTranslations("wizard");
  const d = await data(ctx);
  const name = ctx.profile.first_name ?? "";
  if (intent !== "free" && (!d.main || d.firstDay)) return [{ from: "dot", text: t("tooEarly") }];

  const loser = d.mainAds.find((a) => a.label === "verliezer" && a.status !== "uit") ?? null;
  const loserSpend = loser ? (d.all.get(loser.id)?.spend ?? 0) : 0;

  if (intent === "week") {
    if (d.kind === "leads") {
      const cpl = costPer(d.week.spend, d.week.leads);
      const all = sumRows([]);
      let spendNoLoser = 0;
      let leadsNoLoser = 0;
      for (const a of d.mainAds) {
        if (loser && a.id === loser.id) continue;
        const s = d.all.get(a.id) ?? all;
        spendNoLoser += s.spend;
        leadsNoLoser += s.leads;
      }
      const base = t("weekLeads", {
        name,
        leads: d.week.leads,
        cpl: cpl === null ? "–" : formatEuro(cpl, 2),
        target: d.tg.cpl ? formatEuro(d.tg.cpl) : "[doel]",
      });
      const extra =
        loser && leadsNoLoser
          ? ` ${t("weekLeadsLoser", { ad: loser.name, spend: formatEuro(loserSpend), without: formatEuro(spendNoLoser / leadsNoLoser, 2) })}`
          : "";
      return [{ from: "dot", text: base + extra }];
    }
    const r = roas(d.week.revenue, d.week.spend);
    const be = d.tg.roasTarget;
    const under = be !== null && r < be;
    const text =
      t(under ? "weekSalesUnder" : "weekSales", {
        name,
        sales: d.week.purchases,
        spend: formatEuro(d.week.spend),
        roas: formatRoas(r),
        be: be ? formatRoas(be) : "[break-even]",
      }) + (under && loser ? ` ${t("weekCause", { ad: loser.name })}` : "");
    const bars = d.mainAds.map((a) => {
      const s = d.weekPerAd.get(a.id) ?? sumRows([]);
      return { n: a.code, spend: s.spend, rev: s.revenue };
    });
    return [
      { from: "dot", text },
      { from: "dot", kind: "bars", bars },
    ];
  }

  if (intent === "roas") {
    if (!loser) return [{ from: "dot", text: t("roasFine", { roas: formatRoas(roas(d.week.revenue, d.week.spend)) }) }];
    let spend = 0;
    let rev = 0;
    for (const a of d.mainAds) {
      if (a.id === loser.id) continue;
      const s = d.weekPerAd.get(a.id);
      if (s) {
        spend += s.spend;
        rev += s.revenue;
      }
    }
    return [
      {
        from: "dot",
        text: t(d.kind === "leads" ? "roasLoserLeads" : "roasLoser", {
          ad: loser.name,
          spend: formatEuro(loserSpend),
          without: formatRoas(roas(rev, spend), 2),
          now: formatRoas(roas(d.week.revenue, d.week.spend), 2),
        }),
        buttons: [{ label: t("toToday"), href: "/vandaag" }],
      },
    ];
  }

  if (intent === "which") {
    const by = (k: "video" | "foto") =>
      d.mainAds
        .filter((a) => a.kind === k)
        .reduce(
          (acc, a) => {
            const s = d.weekPerAd.get(a.id);
            return s ? { spend: acc.spend + s.spend, rev: acc.rev + s.revenue } : acc;
          },
          { spend: 0, rev: 0 },
        );
    const v = by("video");
    const f = by("foto");
    const bottoms = d.mainAds.filter((a) => a.phase === "bottom" && a.status !== "uit").length;
    const videoWins = roas(v.rev, v.spend) > roas(f.rev, f.spend);
    const parts = [
      videoWins ? t("whichVideo", { v: formatRoas(roas(v.rev, v.spend), 2), f: formatRoas(roas(f.rev, f.spend), 2) }) : t("whichPhoto"),
      bottoms <= 1 ? t("whichBottom") : "",
      t("whichIdea"),
    ].filter(Boolean);
    return [
      {
        from: "dot",
        text: parts.join(" "),
        buttons: [
          ...(videoWins ? [{ label: t("script"), href: "/studio" }] : []),
          { label: videoWins ? t("uploadVideo") : t("uploadAd"), href: "/advertenties/maken" },
        ],
      },
    ];
  }

  if (intent === "xmas") {
    const credits = await creditsFor(ctx);
    const tgt = d.goal?.targeting ?? {};
    const region = [
      tgt.region ?? (tgt.countries ?? []).join(", "),
      (tgt.languages ?? [])[0] ? t("langAdj", { lang: (tgt.languages ?? [])[0] }) : null,
      tgt.age_max === null || tgt.age_max === undefined
        ? t("agePlus", { min: tgt.age_min ?? 18 })
        : t("ageRange", { min: tgt.age_min ?? 18, max: tgt.age_max }),
    ]
      .filter(Boolean)
      .join(", ");
    const min = ctx.org.kind === "webshop" && d.kind === "sales" ? 30 : 10;
    const year = today().slice(0, 4);
    return [
      { from: "dot", text: t("xmasIntro", { name }) },
      {
        from: "dot",
        kind: "plan",
        plan: {
          rows: [
            [t("plan.campaign"), t("plan.campaignV", { year })],
            [t("plan.goal"), t(`plan.goals.${d.kind}`)],
            [t("plan.period"), t("plan.periodV")],
            [t("plan.region"), region],
            [t("plan.budget"), t(min === 30 ? "plan.budgetWebshop" : "plan.budgetMin", { min: formatEuro(min) })],
            [t("plan.ads"), t("plan.adsV")],
            [t("plan.split"), t("plan.splitV")],
            [t("plan.newAds"), t("plan.newAdsV")],
          ],
          make: tw.raw("xmasAds") as string[],
          credits: credits?.left ?? null,
        },
      },
    ];
  }

  // Vrije vraag: budget aanpassen, looptijd, of iets dat Dot niet kan zien.
  const q = text.toLowerCase();
  const amount = /(\d+(?:[.,]\d+)?)\s*(?:euro|€)?/.exec(q);
  if (/budget/.test(q) && amount && d.main) {
    const v = Number(amount[1].replace(",", "."));
    const min = ctx.org.kind === "webshop" && d.kind === "sales" ? 30 : 10;
    const from = d.main.daily_budget;
    const fromTo = t("fromTo", { from: from ? formatEuro(from) : "[budget]", to: formatEuro(v) });
    return [
      { from: "dot", text: t("changeIntro") },
      { from: "dot", kind: "change", change: { text: t("changeBudget", { fromTo }), fromTo, campaignId: d.main.id, value: v, warn: v < min } },
    ];
  }
  if (/looptijd|tot wanneer/.test(q)) return [{ from: "dot", text: t("period") }];
  return [{ from: "dot", text: t("cantSee"), buttons: [{ label: t("askUs"), href: "/hulp" }] }];
}

// ---------------------------------------------------------------------------
// Gesprek bewaren (assistant_threads, assistant_messages)
// ---------------------------------------------------------------------------

async function thread(ctx: AppContext) {
  const db = await getDb();
  const found = must(
    await db
      .from("assistant_threads")
      .select()
      .eq("organization_id", ctx.org.id)
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  if (found) return found;
  return must(await db.from("assistant_threads").insert({ organization_id: ctx.org.id, user_id: ctx.user.id, title: "Dot" }).select().single());
}

async function save(ctx: AppContext, threadId: string, msgs: DotMessage[]) {
  const db = await getDb();
  if (!msgs.length) return;
  await db.from("assistant_messages").insert(
    msgs.map((m) => ({
      thread_id: threadId,
      organization_id: ctx.org.id,
      role: m.from === "me" ? ("user" as const) : ("assistant" as const),
      content: m.text ?? "",
      tool_calls: (m.kind
        ? { kind: m.kind, bars: m.bars ?? null, plan: m.plan ?? null, buttons: m.buttons ?? null }
        : m.buttons
          ? { buttons: m.buttons }
          : null) as Json,
      pending_change: (m.change ?? null) as Json,
    })),
  );
}

export async function dotHistory(): Promise<DotMessage[]> {
  const ctx = await getContext();
  assertPlan(ctx, "pro");
  const db = await getDb();
  const th = must(
    await db
      .from("assistant_threads")
      .select("id")
      .eq("organization_id", ctx.org.id)
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  if (!th) return [];
  const rows = must(await db.from("assistant_messages").select().eq("thread_id", th.id).order("created_at"));
  return rows.slice(-40).map((r) => {
    const tc = (r.tool_calls ?? {}) as { kind?: DotMessage["kind"]; bars?: DotMessage["bars"]; plan?: DotMessage["plan"]; buttons?: DotMessage["buttons"] };
    return {
      from: r.role === "user" ? "me" : "dot",
      text: r.content || undefined,
      kind: tc.kind,
      bars: tc.bars ?? undefined,
      plan: tc.plan ?? undefined,
      buttons: tc.buttons ?? undefined,
      change: (r.pending_change ?? undefined) as DotMessage["change"],
    };
  });
}

export async function askDot(intent: Intent, text: string): Promise<DotMessage[]> {
  const ctx = await getContext();
  assertPlan(ctx, "pro");
  const t = await getTranslations("dot.questions");
  const q = intent === "free" ? text.trim().slice(0, 500) : t(intent);
  const msgs: DotMessage[] = [{ from: "me", text: q }, ...(await answer(ctx, intent, q))];
  const th = await thread(ctx);
  await save(ctx, th.id, msgs);
  return msgs;
}

/** "Doe het" bij een voorstel van Dot: pas na de klik van de klant, en het komt in het logboek als "Lisa via Dot". */
export async function applyDotChange(change: { campaignId: string; value: number }): Promise<{ ok: boolean; logId?: string }> {
  const ctx = await getContext();
  assertPlan(ctx, "pro");
  assertCanEdit(ctx);
  const db = await getDb();
  const t = await getTranslations("dot.answers");
  const c = must(await db.from("campaigns").select().eq("id", change.campaignId).maybeSingle());
  const v = Math.round(Number(change.value) * 100) / 100;
  if (!c || c.organization_id !== ctx.org.id || !(v > 0 && v <= 100_000)) return { ok: false };
  await db.from("campaigns").update({ daily_budget: v }).eq("id", c.id);
  const fromTo = t("fromTo", { from: c.daily_budget ? formatEuro(c.daily_budget) : "[budget]", to: formatEuro(v) });
  const entry = await writeLog(db, ctx, {
    kind: "budget",
    campaign_id: c.id,
    what: t("logBudget"),
    from_to: fromTo,
    undo: { kind: "budget", campaign_id: c.id, value: c.daily_budget },
    actor: "assistant",
  });
  // Het voorstel in het gesprek als gedaan markeren.
  const th = await thread(ctx);
  const pending = must(await db.from("assistant_messages").select().eq("thread_id", th.id).order("created_at", { ascending: false }).limit(10));
  const msg = pending.find(
    (m) => (m.pending_change as { campaignId?: string; done?: string } | null)?.campaignId === c.id && !(m.pending_change as { done?: string }).done,
  );
  if (msg)
    await db
      .from("assistant_messages")
      .update({ pending_change: { ...(msg.pending_change as object), done: "yes" } as Json })
      .eq("id", msg.id);
  return { ok: true, logId: entry.id };
}

export async function declineDotChange() {
  const ctx = await getContext();
  assertPlan(ctx, "pro");
  const db = await getDb();
  const th = await thread(ctx);
  const pending = must(await db.from("assistant_messages").select().eq("thread_id", th.id).order("created_at", { ascending: false }).limit(10));
  const msg = pending.find((m) => m.pending_change && !(m.pending_change as { done?: string }).done);
  if (msg)
    await db
      .from("assistant_messages")
      .update({ pending_change: { ...(msg.pending_change as object), done: "no" } as Json })
      .eq("id", msg.id);
}

/** De wizard ingevuld door Dot: in het logboek. */
export async function logWizardFill() {
  const ctx = await getContext();
  assertPlan(ctx, "pro");
  const db = await getDb();
  const t = await getTranslations("dot");
  await writeLog(db, ctx, { kind: "wijziging", what: t("fillLog"), from_to: t("fillSteps"), actor: "assistant" });
}
