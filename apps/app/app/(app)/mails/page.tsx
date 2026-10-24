import { notFound } from "next/navigation";
import { MAIL_KINDS, SAMPLES, buildMail, mailLabel, type MailKind } from "@adsweet/mails";
import { formatDateTime } from "@adsweet/ui";
import { env } from "@/lib/env";
import { routeMetadata } from "@/lib/meta";
import { getContext } from "@/lib/server/context";
import { demoPanelEnabled } from "@/lib/server/demo-state";
import { mailTransport, outbox } from "@/lib/server/mail";
import { MailsViewer } from "./MailsViewer";
import "./mails.css";

export const generateMetadata = routeMetadata("mails");

// Mails (Mails.dc.html): de 12 mails bekijken en naar de testomgeving sturen. Hoort niet bij het product: alleen met
// het demopaneel aan, zoals in de demo en in ontwikkeling.
export default async function MailsPage() {
  if (!demoPanelEnabled()) notFound();
  const ctx = await getContext();
  const mails = (MAIL_KINDS as readonly MailKind[]).map((kind) => {
    const m = buildMail(kind, SAMPLES[kind] as never, { appUrl: env.appUrl });
    return { kind, label: mailLabel(kind), subject: m.subject, html: m.html };
  });
  const sent = outbox().map((m) => ({ id: m.id, to: m.to, subject: m.subject, kind: m.kind ?? "", at: formatDateTime(m.at), html: m.html }));
  return <MailsViewer mails={mails} sent={sent} transport={mailTransport().name} me={ctx.profile.email} />;
}
