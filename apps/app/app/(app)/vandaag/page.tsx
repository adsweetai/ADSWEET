import { getTranslations } from "next-intl/server";
import { routeMetadata } from "@/lib/meta";
import { getContext } from "@/lib/server/context";

export const generateMetadata = routeMetadata("vandaag");

// Fase 3: de begroeting en je organisatie binnen de app-shell. Vandaag zelf komt in fase 4.
export default async function TodayPage() {
  const ctx = await getContext();
  const t = await getTranslations("today");
  const tp = await getTranslations("plans");
  const tk = await getTranslations("kinds");
  const tr = await getTranslations("roles");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, maxWidth: 760 }}>
      <h1 className="as-h-greeting">{t("greeting", { name: ctx.profile.first_name ?? "" })}</h1>
      <section aria-label={t("org")} className="as-card" style={{ padding: "18px 20px" }}>
        <h2 className="as-h-card" style={{ marginBottom: 8 }} data-testid="org-name">
          {ctx.org.name}
        </h2>
        <dl style={{ margin: 0, display: "grid", gridTemplateColumns: "max-content 1fr", gap: "4px 16px", fontSize: 14 }}>
          <dt className="as-muted">{t("plan")}</dt>
          <dd style={{ margin: 0 }}>{tp(ctx.plan)}</dd>
          <dt className="as-muted">{t("kind")}</dt>
          <dd style={{ margin: 0 }}>{tk(ctx.org.kind)}</dd>
          <dt className="as-muted">{t("role")}</dt>
          <dd style={{ margin: 0 }}>{tr(ctx.role)}</dd>
        </dl>
        {ctx.clients.length && !ctx.inClient ? (
          <p className="as-muted" style={{ margin: "12px 0 0", fontSize: 14 }}>
            {t("clients", { count: ctx.clients.length })}: {ctx.clients.map((c) => c.name).join(", ")}
          </p>
        ) : null}
      </section>
    </div>
  );
}
