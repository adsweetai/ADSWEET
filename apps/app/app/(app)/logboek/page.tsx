import { getTranslations } from "next-intl/server";
import { must, type LogEntry } from "@adsweet/db";
import { brusselsDate, formatDayMonth, formatTime } from "@adsweet/ui";
import { routeMetadata } from "@/lib/meta";
import { getDb } from "@/lib/server/auth";
import { getContext } from "@/lib/server/context";
import { LogFilters, UndoButton } from "./LogClient";
import "./logboek.css";

export const generateMetadata = routeMetadata("logboek");

const KIND_OF: Record<LogEntry["kind"], string> = {
  budget: "budget",
  advertentie: "advertenties",
  extra: "instellingen",
  wijziging: "instellingen",
  campagne: "instellingen",
  audit: "audit",
};

export default async function LogbookPage({ searchParams }: { searchParams: Promise<{ wie?: string; campagne?: string; soort?: string }> }) {
  const ctx = await getContext();
  const t = await getTranslations("logbook");
  const db = await getDb();
  const sp = await searchParams;
  const [rows, campaigns] = await Promise.all([
    db.from("log_entries").select().eq("organization_id", ctx.org.id).order("at", { ascending: false }).then(must),
    db.from("campaigns").select("id, name").eq("organization_id", ctx.org.id).order("created_at").then(must),
  ]);
  const who = sp.wie ?? "alle";
  const filtered = rows.filter((r) => {
    if (who === "jij" && !(r.actor === "user" && r.user_id === ctx.user.id)) return false;
    if (who === "team" && !(r.actor === "user" && r.user_id !== ctx.user.id)) return false;
    if (who === "autopilot" && r.actor !== "autopilot") return false;
    if (who === "buiten" && r.actor !== "outside") return false;
    if (sp.campagne && r.campaign_id !== sp.campagne) return false;
    if (sp.soort && sp.soort !== "alles" && KIND_OF[r.kind] !== sp.soort) return false;
    return true;
  });
  const actor = (r: LogEntry) =>
    r.actor === "user" ? (r.actor_name ?? "") : r.actor === "assistant" ? t("actor.assistant", { name: r.actor_name ?? "" }) : t(`actor.${r.actor}`);
  const when = (r: LogEntry) =>
    r.time_known ? `${formatDayMonth(brusselsDate(r.at))} ${formatTime(r.at)}` : t("timeUnknown", { date: formatDayMonth(brusselsDate(r.at)) });
  const dot = (r: LogEntry) => (r.actor === "outside" ? "warn" : r.actor === "user" || r.actor === "assistant" ? "ink" : "muted");

  return (
    <div className="lb">
      <LogFilters
        values={{ wie: who, campagne: sp.campagne ?? "", soort: sp.soort ?? "alles" }}
        campaigns={campaigns.map((c) => ({ value: c.id, label: c.name }))}
      />
      {filtered.length === 0 ? <p className="as-muted">{t("empty")}</p> : null}
      <ol className="lb-list">
        {filtered.map((r) => (
          <li key={r.id} className="lb-row">
            <span className="lb-when">{when(r)}</span>
            <span className="lb-who">
              <span className={`lb-dot lb-dot--${dot(r)}`} aria-hidden="true" />
              {actor(r)}
            </span>
            <span className="lb-what">
              <span>{r.what}</span>
              {r.from_to ? <span className="lb-fromto">{r.from_to}</span> : null}
            </span>
            {r.undo && !r.undone_at && ctx.canEdit ? <UndoButton id={r.id} /> : r.undone_at ? <span className="as-small">{t("undone")}</span> : <span />}
          </li>
        ))}
      </ol>
    </div>
  );
}
