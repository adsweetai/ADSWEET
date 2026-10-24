import "server-only";
import { getTranslations } from "next-intl/server";
import type { NotificationRow } from "@adsweet/db";
import { brusselsDate, formatDateTime, formatDayMonth, formatEuro, formatNumber, formatTime } from "@adsweet/ui";

export interface NotificationText {
  badge: string;
  type: string;
  what: string;
  mean: string;
  todo: string;
  button: string;
  when: string;
  example: boolean;
}

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0));

/** Zet een melding om naar tekst: wat er gebeurde, wat het betekent, wat je doet. */
export async function notificationText(n: NotificationRow, today: string): Promise<NotificationText> {
  const t = await getTranslations("notifications");
  const ts = await getTranslations("ui.status");
  const tsh = await getTranslations("shell");
  const p = n.payload ?? {};
  const params: Record<string, string | number> = {};
  if (n.type === "buiten_app") {
    params.ad = String(p.ad_name ?? "");
    params.date = p.date ? formatDayMonth(String(p.date)) : "";
  }
  if (n.type === "vermoeidheid") {
    params.from = `${formatNumber(num(p.ctr_from), 1)}%`;
    params.to = `${formatNumber(num(p.ctr_to), 1)}%`;
    params.freq = formatNumber(num(p.frequency), 1);
  }
  if (n.type === "proef_bijna_om") {
    params.days = num(p.days_left);
    params.date = p.pay_date ? formatDayMonth(String(p.pay_date)) : "";
    params.amount = formatEuro(num(p.amount), 2);
  }
  if (n.type === "credits_bijna_op") {
    params.left = num(p.left);
    params.total = num(p.total);
  }
  const key = `types.${n.type}` as const;
  const has = t.has(`${key}.type`);
  const example = p.example === true;
  const when = example ? tsh("example") : brusselsDate(n.created_at) === today ? t("today", { time: formatTime(n.created_at) }) : formatDateTime(n.created_at);
  return {
    badge: ts(n.severity === "ok" ? "ok" : n.severity),
    type: has ? t(`${key}.type`) : n.type,
    what: has ? t(`${key}.what`, params) : "",
    mean: has ? t(`${key}.mean`, params) : "",
    todo: has ? t(`${key}.todo`, params) : "",
    button: has ? t(`${key}.btn`) : "",
    when,
    example,
  };
}
