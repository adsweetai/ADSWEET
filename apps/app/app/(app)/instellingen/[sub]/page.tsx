import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { env } from "@/lib/env";
import { routeMetadata } from "@/lib/meta";
import { SETTINGS_PAGES, type SettingsPage } from "@/lib/routes";
import { getContext } from "@/lib/server/context";
import { TIMEZONES, loadSettings } from "@/lib/server/settings";
import { Row, Rows } from "../Row";
import { AccountsList, ConnectionsList, LanguageRows, NamingForm, NotificationsList, NumbersForm, PayerForm, PrivacyRows, ProfileForm } from "../Settings";
import { SettingsFrame } from "../SettingsFrame";

export const generateMetadata = routeMetadata("instellingen");

const OWN_ROUTE = new Set<SettingsPage>(["team", "abonnement", "doorverwijzen"]);

export default async function SettingsPage({ params }: { params: Promise<{ sub: string }> }) {
  const { sub } = await params;
  if (!SETTINGS_PAGES.includes(sub as SettingsPage)) notFound();
  const page = sub as SettingsPage;
  if (OWN_ROUTE.has(page)) redirect(`/${page}`);
  const ctx = await getContext();
  const vm = await loadSettings(ctx, page as Exclude<SettingsPage, "team" | "abonnement" | "doorverwijzen">);
  const t = await getTranslations("settings");
  let body: React.ReactNode = null;
  switch (vm.sub) {
    case "profiel":
      body = <ProfileForm vm={vm.profile} canEdit={ctx.canEdit} />;
      break;
    case "cijfers":
      body = <NumbersForm vm={vm.numbers} canEdit={ctx.canEdit} />;
      break;
    case "koppelingen":
      body = <ConnectionsList rows={vm.connections} biz={vm.biz} canEdit={ctx.canEdit} />;
      break;
    case "accounts":
      body = <AccountsList vm={vm.accounts} />;
      break;
    case "naamgeving":
      body = <NamingForm vm={vm.naming} canEdit={ctx.canEdit} />;
      break;
    case "betaler":
      body = <PayerForm vm={vm.payer} canEdit={ctx.canEdit} />;
      break;
    case "meldingen":
      body = <NotificationsList rows={vm.notifications} />;
      break;
    case "taal":
      body = <LanguageRows vm={vm.language} timezones={TIMEZONES} />;
      break;
    case "privacy":
      body = <PrivacyRows vm={vm.privacy} canEdit={ctx.canEdit} siteUrl={env.siteUrl} />;
      break;
    case "playbook":
      body = (
        <>
          <Rows>
            {vm.playbook.rules.map((r) => (
              <Row key={r} title={r} />
            ))}
          </Rows>
          <p className="st-note">{vm.playbook.note}</p>
        </>
      );
      break;
    case "ontwikkelaars":
      body = (
        <Rows>
          <Row title={t("developers.api")} sub={t("developers.later")} />
          <Row title={t("developers.mcp")} sub={t("developers.later")} />
        </Rows>
      );
      break;
  }
  return <SettingsFrame current={page}>{body}</SettingsFrame>;
}
