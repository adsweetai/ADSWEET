import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

// Verzenden. Resend in productie (RESEND_API_KEY, alleen op de server). Zonder sleutel, in de demo en in tests: een
// postvak in het geheugen, en desgewenst als bestanden op schijf. Zo zie je wat er verstuurd zou zijn.

export interface OutgoingMail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Soort mail, voor de logs van Resend. */
  kind?: string;
}

export interface SentMail extends OutgoingMail {
  id: string;
  at: string;
  transport: "resend" | "outbox";
}

export interface Transport {
  name: "resend" | "outbox";
  send(mail: OutgoingMail): Promise<SentMail>;
}

const RESEND_URL = "https://api.resend.com/emails";

/** Resend: POST /emails met de sleutel als Bearer-token. */
export function resendTransport(apiKey: string, fetchImpl: typeof fetch = fetch): Transport {
  if (!apiKey) throw new Error("RESEND_API_KEY ontbreekt.");
  return {
    name: "resend",
    async send(mail) {
      const res = await fetchImpl(RESEND_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({
          from: mail.from,
          to: [mail.to],
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
          ...(mail.kind ? { tags: [{ name: "mail", value: mail.kind }] } : {}),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
      if (!res.ok || !body.id) throw new Error(`Resend weigerde de mail: ${res.status} ${body.message ?? ""}`.trim());
      return { ...mail, id: body.id, at: new Date().toISOString(), transport: "resend" };
    },
  };
}

const g = globalThis as unknown as { __adsweetOutbox?: SentMail[] };

/** Alles wat in dit proces via het postvak ging, nieuwste eerst. */
export function outbox(): SentMail[] {
  g.__adsweetOutbox ??= [];
  return g.__adsweetOutbox;
}

/** Postvak: bewaart de mail in het geheugen en, met een map, ook als .html en .txt. */
export function outboxTransport(dir?: string): Transport {
  let n = 0;
  return {
    name: "outbox",
    async send(mail) {
      const at = new Date().toISOString();
      const id = `outbox-${Date.now().toString(36)}-${(n++).toString(36)}`;
      const sent: SentMail = { ...mail, id, at, transport: "outbox" };
      outbox().unshift(sent);
      if (outbox().length > 200) outbox().length = 200;
      if (dir) {
        await mkdir(dir, { recursive: true });
        const base = join(dir, `${at.replace(/[:.]/g, "-")}-${mail.kind ?? "mail"}`);
        await writeFile(`${base}.html`, mail.html, "utf8");
        await writeFile(`${base}.txt`, `Aan: ${mail.to}\nVan: ${mail.from}\nOnderwerp: ${mail.subject}\n\n${mail.text}`, "utf8");
      }
      return sent;
    },
  };
}
