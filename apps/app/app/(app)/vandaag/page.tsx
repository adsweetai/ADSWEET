import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Logo } from "@adsweet/ui";
import { getContext } from "@/lib/server/context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("vandaag") };
}

// Fase 1: bewijst dat inloggen werkt en dat je alleen je eigen organisatie ziet. Vandaag zelf komt in fase 4.
export default async function TodayPage() {
  const ctx = await getContext();
  const t = await getTranslations("today");
  const tp = await getTranslations("plans");
  const tk = await getTranslations("kinds");
  const tr = await getTranslations("roles");
  const tn = await getTranslations("nav");
  const clients = ctx.orgs.filter((o) => o.agency_parent_id === ctx.org.id);
  return (
    <main
      style={{
        padding: "28px clamp(20px, 3vw, 40px)",
        display: "flex",
        flexDirection: "column",
        gap: 24,
        maxWidth: 760,
      }}
    >
      <Logo />
      <h1
        style={{
          margin: 0,
          fontSize: "var(--fs-greeting)",
          fontWeight: 500,
          letterSpacing: "-.03em",
          lineHeight: 1.05,
        }}
      >
        {t("greeting", { name: ctx.profile.first_name ?? "" })}
      </h1>
      <section
        aria-label={t("org")}
        style={{
          padding: "18px 20px",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-card)",
          background: "var(--surface)",
        }}
      >
        <h2
          style={{
            margin: "0 0 8px",
            fontSize: "var(--fs-card)",
            fontWeight: 500,
            letterSpacing: "var(--ls-card)",
          }}
          data-testid="org-name"
        >
          {ctx.org.name}
        </h2>
        <dl
          style={{
            margin: 0,
            display: "grid",
            gridTemplateColumns: "max-content 1fr",
            gap: "4px 16px",
            fontSize: 14,
          }}
        >
          <dt style={{ color: "var(--ink-muted)" }}>{t("plan")}</dt>
          <dd style={{ margin: 0 }}>{tp(ctx.org.plan)}</dd>
          <dt style={{ color: "var(--ink-muted)" }}>{t("kind")}</dt>
          <dd style={{ margin: 0 }}>{tk(ctx.org.kind)}</dd>
          <dt style={{ color: "var(--ink-muted)" }}>{t("role")}</dt>
          <dd style={{ margin: 0 }}>{tr(ctx.role)}</dd>
        </dl>
        {clients.length ? (
          <p style={{ margin: "12px 0 0", fontSize: 14, color: "var(--ink-muted)" }}>
            {t("clients", { count: clients.length })}: {clients.map((c) => c.name).join(", ")}
          </p>
        ) : null}
      </section>
      <form action="/auth/uitloggen" method="post">
        <button
          type="submit"
          style={{
            padding: "4px 0",
            border: 0,
            borderBottom: "1px solid var(--line-strong)",
            background: "none",
            color: "var(--ink)",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {tn("logout")}
        </button>
      </form>
    </main>
  );
}
