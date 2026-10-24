import "server-only";
import { must } from "@adsweet/db";
import { MAIL_FROM, buildMail, outbox, outboxTransport, resendTransport, type MailData, type MailKind, type SentMail, type Transport } from "@adsweet/mails";
import { env, isDemo } from "@/lib/env";
import { serviceDb } from "./auth";

// Mails vanuit Beheer (packages/mails), met links naar de app. Resend met RESEND_API_KEY, anders het postvak.

const g = globalThis as unknown as { __beheerMailTransport?: Transport };

function transport(): Transport {
  if (g.__beheerMailTransport) return g.__beheerMailTransport;
  const key = process.env.RESEND_API_KEY ?? "";
  g.__beheerMailTransport =
    key && !isDemo && process.env.MAIL_MODE !== "outbox" ? resendTransport(key) : outboxTransport(process.env.MAIL_OUTBOX_DIR || undefined);
  return g.__beheerMailTransport;
}

export async function sendMail<K extends MailKind>(kind: K, to: string, data: MailData[K]): Promise<SentMail | null> {
  try {
    const m = buildMail(kind, data, { appUrl: env.appUrl });
    return await transport().send({ from: process.env.MAIL_FROM || MAIL_FROM, to, subject: m.subject, html: m.html, text: m.text, kind });
  } catch (e) {
    console.error(`Mail ${kind} naar ${to} niet verstuurd:`, e);
    return null;
  }
}

/** Het e-mailadres van de eigenaar van een organisatie. */
export async function ownerEmail(orgId: string): Promise<string | null> {
  const svc = serviceDb();
  const m = must(await svc.from("members").select("user_id").eq("organization_id", orgId).eq("role", "eigenaar").limit(1).maybeSingle());
  if (!m) return null;
  return must(await svc.from("profiles").select("email").eq("user_id", m.user_id).maybeSingle())?.email ?? null;
}

export { outbox };
