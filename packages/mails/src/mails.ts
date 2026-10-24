import M from "./nl.json";
import { renderMail, type MailContent, type RenderedMail } from "./layout";

// De 12 mails (Mails.dc.html). Elke mail krijgt zijn gegevens van de app; de teksten staan in nl.json, zodat FR en
// EN later kunnen. Plaatshouders tussen [haken] blijven staan tot PJ ze invult.

export const MAIL_KINDS = [
  "welkom",
  "login",
  "uitnodiging",
  "proefBijnaOm",
  "proefOmgezet",
  "factuur",
  "betalingMislukt",
  "weekrapport",
  "actieNodig",
  "kwartaalcall",
  "doorverwijzing",
  "opgezegd",
] as const;
export type MailKind = (typeof MAIL_KINDS)[number];

export interface WeeklyData {
  name: string;
  kind: "leads" | "sales" | "none";
  spend: string;
  /** Aantal aanvragen of verkopen. */
  n: number;
  /** Kost per aanvraag (leads) of ROAS (sales). */
  value: string;
  /** Omzet (sales). */
  revenue?: string;
  /** Doel per aanvraag of break-even. */
  target?: string;
  prev?: { n: number; value: string };
  best?: string;
  worst?: { name: string; spend: string };
  week: string;
}

export interface MailData {
  welkom: { name: string };
  login: { url: string };
  uitnodiging: { inviter: string; org: string; role: "eigenaar" | "beheerder" | "lezer"; url: string };
  proefBijnaOm: { name: string; days: number; date: string; price: string; vat: string; total: string; plan: string; founding: boolean };
  proefOmgezet: { plan: string; price: string };
  factuur: { date: string; plan: string; founding: boolean; price: string; vat: string; total: string; method: string; url: string };
  betalingMislukt: { total: string };
  weekrapport: WeeklyData;
  actieNodig: { name: string; subject: string; title: string; body: string[] };
  kwartaalcall: { date: string; time: string };
  doorverwijzing: { name: string; date: string };
  opgezegd: { date: string };
}

/** {naam} → waarde. Een onbekend stuk blijft staan. */
export const fill = (s: string, v: object) =>
  s.replace(/\{(\w+)\}/g, (m, k: string) => {
    const x = (v as Record<string, unknown>)[k];
    return typeof x === "string" || typeof x === "number" ? String(x) : m;
  });

type Builder<K extends MailKind> = (d: MailData[K], app: string) => MailContent;

const BUILDERS: { [K in MailKind]: Builder<K> } = {
  welkom: (d, app) => {
    const t = M.mails.welkom;
    return { subject: fill(t.subject, d), title: fill(t.title, d), body: t.body, button: { label: t.button, href: `${app}/vandaag` } };
  },
  login: (d) => {
    const t = M.mails.login;
    return { subject: t.subject, title: t.title, body: t.body, button: { label: t.button, href: d.url }, small: t.small };
  },
  uitnodiging: (d) => {
    const t = M.mails.uitnodiging;
    return { subject: fill(t.subject, d), title: fill(t.title, d), body: [t.roles[d.role]], button: { label: t.button, href: d.url } };
  },
  proefBijnaOm: (d, app) => {
    const t = M.mails.proefBijnaOm;
    const v = { ...d, founding: d.founding ? t.founding : "" };
    return {
      subject: fill(t.subject, v),
      title: fill(t.title, v),
      body: t.body.map((x) => fill(x, v)),
      button: { label: t.button, href: `${app}/abonnement` },
    };
  },
  proefOmgezet: (d, app) => {
    const t = M.mails.proefOmgezet;
    return { subject: t.subject, title: t.title, body: t.body.map((x) => fill(x, d)), button: { label: t.button, href: `${app}/abonnement` } };
  },
  factuur: (d) => {
    const t = M.mails.factuur;
    const v = { ...d, founding: d.founding ? t.founding : "" };
    return {
      subject: fill(t.subject, v),
      title: fill(t.title, v),
      body: t.body.map((x) => fill(x, v)),
      button: { label: t.button, href: d.url },
      small: t.small,
    };
  },
  betalingMislukt: (d, app) => {
    const t = M.mails.betalingMislukt;
    return { subject: t.subject, title: t.title, body: t.body.map((x) => fill(x, d)), button: { label: t.button, href: `${app}/abonnement` } };
  },
  weekrapport: (d, app) => {
    const t = M.mails.weekrapport;
    let first = fill(t.none, d);
    if (d.kind === "leads")
      first =
        fill(t.leads, { ...d, cpl: d.value }) +
        (d.target ? fill(t.leadsTarget, d) : "") +
        (d.prev ? fill(t.leadsPrev, { pn: d.prev.n, pcpl: d.prev.value }) : "");
    if (d.kind === "sales")
      first =
        fill(t.sales, { ...d, revenue: d.revenue ?? "", roas: d.value }) +
        (d.target ? fill(t.salesTarget, d) : "") +
        (d.prev ? fill(t.salesPrev, { proas: d.prev.value }) : "");
    const second =
      d.best && d.kind !== "none"
        ? fill(t.best, { best: d.best }) + (d.worst ? fill(t.worst, { worst: d.worst.name, worstSpend: d.worst.spend, noun: t.nouns[d.kind] }) : "")
        : null;
    const tile =
      d.kind === "none"
        ? [{ k: t.tile.spend, v: d.spend }]
        : [
            { k: t.tile.spend, v: d.spend },
            { k: d.kind === "leads" ? t.tile.leads : t.tile.sales, v: String(d.n) },
            { k: d.kind === "leads" ? t.tile.cpl : t.tile.roas, v: d.value },
          ];
    return {
      subject: t.subject,
      title: fill(t.title, d),
      body: second ? [first, second] : [first],
      tile,
      button: { label: t.button, href: `${app}/weekrapport/${d.week}` },
    };
  },
  actieNodig: (d, app) => {
    const t = M.mails.actieNodig;
    return { subject: fill(t.subject, d), title: fill(t.title, d), body: d.body, button: { label: t.button, href: `${app}/vandaag` } };
  },
  kwartaalcall: (d, app) => {
    const t = M.mails.kwartaalcall;
    return { subject: t.subject, title: t.title, body: t.body.map((x) => fill(x, d)), button: { label: t.button, href: `${app}/hulp` } };
  },
  doorverwijzing: (d, app) => {
    const t = M.mails.doorverwijzing;
    return { subject: t.subject, title: t.title, body: t.body.map((x) => fill(x, d)), button: { label: t.button, href: `${app}/doorverwijzen` } };
  },
  opgezegd: (d, app) => {
    const t = M.mails.opgezegd;
    return { subject: t.subject, title: t.title, body: t.body.map((x) => fill(x, d)), button: { label: t.button, href: `${app}/instellingen/privacy` } };
  },
};

export const mailLabel = (kind: MailKind) => M.mails[kind].label;

/** Bouwt een mail: onderwerp, HTML en tekst. */
export function buildMail<K extends MailKind>(kind: K, data: MailData[K], opts: { appUrl: string }): RenderedMail & { kind: K } {
  const app = opts.appUrl.replace(/\/$/, "");
  const content = (BUILDERS[kind] as Builder<K>)(data, app);
  return { kind, ...renderMail(content, { appUrl: app }) };
}

export const MAIL_FROM = M.from;
