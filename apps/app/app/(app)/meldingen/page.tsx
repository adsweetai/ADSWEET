import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { must } from "@adsweet/db";
import { StatusBadge } from "@adsweet/ui";
import { today } from "@/lib/clock";
import { routeMetadata } from "@/lib/meta";
import { hasAI } from "@/lib/plans";
import { getDb } from "@/lib/server/auth";
import { getContext } from "@/lib/server/context";
import { notificationText } from "@/lib/server/notifications";
import "./meldingen.css";

export const generateMetadata = routeMetadata("meldingen");

type Filter = "alles" | "act" | "warn";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const ctx = await getContext();
  const t = await getTranslations("notificationsPage");
  const db = await getDb();
  const sp = await searchParams;
  const filter: Filter = sp.filter === "act" || sp.filter === "warn" ? sp.filter : "alles";
  const rows = must(await db.from("notifications").select().eq("organization_id", ctx.org.id).order("created_at", { ascending: false }));
  const visible = rows.filter((n) => (n.type !== "credits_bijna_op" || hasAI(ctx.plan)) && (filter === "alles" || n.severity === filter));
  const day = today();
  const items = await Promise.all(visible.map(async (n) => ({ n, txt: await notificationText(n, day) })));

  return (
    <div className="ml">
      <div role="group" aria-label={t("filterLabel")} className="as-pills">
        {(["alles", "act", "warn"] as Filter[]).map((f) => (
          <Link key={f} href={f === "alles" ? "/meldingen" : `/meldingen?filter=${f}`} aria-pressed={filter === f} className="as-pill ml-pill">
            {t(`filters.${f}`)}
          </Link>
        ))}
      </div>
      {items.length === 0 ? <p className="as-muted">{t("empty")}</p> : null}
      {items.map(({ n, txt }) => (
        <article key={n.id} className="ml-item">
          <div className="ml-item__head">
            <StatusBadge kind={n.severity === "ok" ? "ok" : n.severity}>
              {txt.badge} · {txt.type}
            </StatusBadge>
            <span className="as-small" style={{ fontSize: 12.5 }}>
              {t("channels", { when: txt.when })}
            </span>
          </div>
          <div className="ml-item__col">
            <span className="ml-item__k">{t("what")}</span>
            <span style={{ fontWeight: 500 }}>{txt.what}</span>
          </div>
          <div className="ml-item__col">
            <span className="ml-item__k">{t("mean")}</span>
            <span>{txt.mean}</span>
          </div>
          <div className="ml-item__col">
            <span className="ml-item__k">{t("todo")}</span>
            <span>{txt.todo}</span>
          </div>
          <Link href={n.href ?? "/vandaag"} className="as-btn as-btn--secondary ml-item__btn">
            {txt.button}
          </Link>
        </article>
      ))}
    </div>
  );
}
