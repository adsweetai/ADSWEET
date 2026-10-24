import { join } from "node:path";
import { MAIL_FROM, MAIL_KINDS, SAMPLES, buildMail, outboxTransport, resendTransport, type MailKind } from "../src/index";

// Verstuurt de 12 voorbeeldmails naar een testomgeving.
// - Met RESEND_API_KEY: via Resend naar MAIL_TEST_TO, standaard delivered@resend.dev (het testadres van Resend).
// - Zonder sleutel: naar het postvak in .mail-outbox/ (HTML en tekst), om in een browser te openen.

const key = process.env.RESEND_API_KEY ?? "";
const to = process.env.MAIL_TEST_TO || "delivered@resend.dev";
const app = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const dir = join(process.cwd(), "..", "..", ".mail-outbox");
const transport = key ? resendTransport(key) : outboxTransport(dir);

for (const kind of MAIL_KINDS as readonly MailKind[]) {
  const m = buildMail(kind, SAMPLES[kind] as never, { appUrl: app });
  const sent = await transport.send({ from: process.env.MAIL_FROM || MAIL_FROM, to, subject: m.subject, html: m.html, text: m.text, kind });
  console.log(`${transport.name} · ${sent.id} · ${m.subject}`);
}
console.log(key ? `12 mails verstuurd via Resend naar ${to}.` : `12 mails in het postvak: ${dir}`);
