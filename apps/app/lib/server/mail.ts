import "server-only";
import { must } from "@adsweet/db";
import { MAIL_FROM, buildMail, outbox, outboxTransport, resendTransport, type MailData, type MailKind, type SentMail, type Transport } from "@adsweet/mails";
import { env, isDemo } from "@/lib/env";
import { serviceDb } from "./auth";

// Mails versturen vanuit de app (packages/mails). Met RESEND_API_KEY via Resend; in de demomodus, zonder sleutel of
// met MAIL_MODE=outbox naar het postvak (in het geheugen, en met MAIL_OUTBOX_DIR ook op schijf). De sleutel blijft
// op de server.

const g = globalThis as unknown as { __adsweetMailTransport?: Transport };

export function mailTransport(): Transport {
  if (g.__adsweetMailTransport) return g.__adsweetMailTransport;
  const key = process.env.RESEND_API_KEY ?? "";
  g.__adsweetMailTransport =
    key && !isDemo && process.env.MAIL_MODE !== "outbox" ? resendTransport(key) : outboxTransport(process.env.MAIL_OUTBOX_DIR || undefined);
  return g.__adsweetMailTransport;
}

/** Verstuurt een mail. Een fout breekt de actie van de klant niet: ze komt in de log. */
export async function sendMail<K extends MailKind>(kind: K, to: string, data: MailData[K]): Promise<SentMail | null> {
  try {
    const m = buildMail(kind, data, { appUrl: env.appUrl });
    return await mailTransport().send({ from: process.env.MAIL_FROM || MAIL_FROM, to, subject: m.subject, html: m.html, text: m.text, kind });
  } catch (e) {
    console.error(`Mail ${kind} naar ${to} niet verstuurd:`, e);
    return null;
  }
}

/** Mag deze gebruiker over dit soort melding een mail krijgen? (Instellingen › Meldingen) */
export async function wantsMail(orgId: string, userId: string, type: string): Promise<boolean> {
  const s = must(
    await serviceDb().from("notification_settings").select("email").eq("organization_id", orgId).eq("user_id", userId).eq("type", type).maybeSingle(),
  );
  return s?.email !== false;
}

/** De eigenaar van een organisatie: e-mail en voornaam. */
export async function ownerOf(orgId: string): Promise<{ userId: string; email: string; name: string } | null> {
  const svc = serviceDb();
  const m = must(await svc.from("members").select("user_id").eq("organization_id", orgId).eq("role", "eigenaar").limit(1).maybeSingle());
  if (!m) return null;
  const p = must(await svc.from("profiles").select("email, first_name").eq("user_id", m.user_id).maybeSingle());
  return p ? { userId: m.user_id, email: p.email, name: p.first_name ?? "" } : null;
}

export { outbox };
