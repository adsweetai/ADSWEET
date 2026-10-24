import { getTranslations } from "next-intl/server";
import type { LogEntry } from "@adsweet/db";
import { brusselsDate, formatDayMonth, formatTime } from "@adsweet/ui";
import { UndoButton } from "@/app/(app)/logboek/LogClient";

/** De regels van het logboek: wanneer, wie, wat, van → naar en Ongedaan maken. Ook gebruikt op het campagnedetail. */
export async function LogList({ rows, canEdit }: { rows: LogEntry[]; canEdit: boolean }) {
  const t = await getTranslations("logbook");
  const actor = (r: LogEntry) =>
    r.actor === "user" ? (r.actor_name ?? "") : r.actor === "assistant" ? t("actor.assistant", { name: r.actor_name ?? "" }) : t(`actor.${r.actor}`);
  const when = (r: LogEntry) =>
    r.time_known ? `${formatDayMonth(brusselsDate(r.at))} ${formatTime(r.at)}` : t("timeUnknown", { date: formatDayMonth(brusselsDate(r.at)) });
  const dot = (r: LogEntry) => (r.actor === "outside" ? "warn" : r.actor === "user" || r.actor === "assistant" ? "ink" : "muted");
  if (!rows.length) return <p className="as-muted">{t("empty")}</p>;
  return (
    <ol className="lb-list">
      {rows.map((r) => (
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
          {r.undo && !r.undone_at && canEdit ? <UndoButton id={r.id} /> : r.undone_at ? <span className="as-small">{t("undone")}</span> : <span />}
        </li>
      ))}
    </ol>
  );
}
