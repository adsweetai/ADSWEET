import { mkdtemp, readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { MAIL_FROM, MAIL_KINDS, SAMPLES, blend, buildMail, outbox, outboxTransport, resendTransport, type MailKind } from "./index";

const APP = "https://app.adsweet.ai";
const all = () => MAIL_KINDS.map((k) => buildMail(k, SAMPLES[k] as never, { appUrl: APP }));

describe("de 12 mails", () => {
  it("zijn er alle 12, in de volgorde van het prototype", () => {
    expect(MAIL_KINDS).toHaveLength(12);
    expect(all().map((m) => m.subject)).toEqual([
      "Welkom bij AdSweet, Sarah",
      "Je link om in te loggen",
      "Lisa nodigt je uit voor Atelier Noor",
      "Nog 3 dagen gratis",
      "Je abonnement loopt",
      "Je factuur van [datum]",
      "Je betaling is mislukt",
      "Je week in het kort",
      "Actie nodig: ‘Sfeerbeeld woonkamer’",
      "Je kwartaalcall staat vast",
      "Je krijgt een maand gratis",
      "Je abonnement is opgezegd",
    ]);
  });

  it("volgen de regels voor mails: 600px, tabellen, inline stijlen, licht, geen CSS-variabelen", () => {
    for (const m of all()) {
      expect(m.html).toContain('width="600"');
      expect(m.html).toContain("max-width:600px");
      expect(m.html).toContain('role="presentation"');
      expect(m.html).toContain('content="light only"');
      expect(m.html).not.toMatch(/var\(--/);
      expect(m.html).not.toMatch(/<style|class=/);
      expect(m.html).toContain("Hit the ");
      expect(m.text).toContain("Meldingen aanpassen: https://app.adsweet.ai/instellingen/meldingen");
    }
  });

  it("vullen de teksten in zoals in het prototype", () => {
    const [welkom, , uitnodiging, proef, , factuur, mislukt, week, actie] = all();
    expect(welkom.html).toContain("Welkom bij AdSweet, Sarah.");
    expect(welkom.html).toContain('href="https://app.adsweet.ai/vandaag"');
    expect(uitnodiging.html).toContain("Je rol is Beheerder: je kan alles behalve het abonnement.");
    expect(proef.text).toContain("Op 16 december betaal je €136,50 + €28,67 btw = €165,17 per maand voor Pro, met je founding-korting.");
    expect(factuur.text).toContain("Pro, founding member: €136,50 + €28,67 btw = €165,17.");
    expect(factuur.text).toContain("Betaald met [betaalmethode].");
    expect(mislukt.text).toContain("We konden €165,17 niet afschrijven.");
    expect(week.text).toContain("Je gaf €105 uit en kreeg 5 aanvragen, €21,00 per aanvraag. Je doel is €20. Vorige week waren het 4 aanvragen aan €26,25.");
    expect(week.text).toContain("Beste advertentie: ‘Voor en na’. Slechtste: ‘Ons team aan het werk’, €60 zonder aanvraag.");
    expect(week.text).toContain("Uitgegeven: €105 · Aanvragen: 5 · Kost per aanvraag: €21,00");
    expect(actie.html).toContain("Lisa, ‘Sfeerbeeld woonkamer’ gaf €72 uit zonder verkoop.");
  });

  it("ontsnapt tekst uit de app", () => {
    const m = buildMail("welkom", { name: '<script>"x"</script>' }, { appUrl: APP });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
  });

  it("weekrapport voor een webshop", () => {
    const m = buildMail(
      "weekrapport",
      { name: "Lisa", kind: "sales", spend: "€280", n: 11, revenue: "€638", value: "2,28", target: "2,5", week: "2026-11-30" },
      { appUrl: APP },
    );
    expect(m.text).toContain("Je gaf €280 uit en verkocht 11 keer voor €638: ROAS 2,28. Je break-even is 2,5.");
    expect(m.text).toContain("ROAS: 2,28");
  });

  it("houdt de kleuren gelijk met het designsysteem", async () => {
    const css = await readFile(join(__dirname, "..", "..", "ui", "src", "tokens.source.css"), "utf8");
    const light = css.slice(0, css.indexOf("@media"));
    const value = (name: string) => new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6,8})`).exec(light)?.[1]?.toUpperCase();
    const { MAIL_TOKENS } = await import("./tokens");
    expect(MAIL_TOKENS.ground).toBe(value("ground"));
    expect(MAIL_TOKENS.ink).toBe(value("ink"));
    expect(MAIL_TOKENS.inkMuted).toBe(value("ink-muted"));
    expect(MAIL_TOKENS.inkAccent).toBe(value("ink-accent"));
    expect(MAIL_TOKENS.robijn).toBe(value("robijn"));
    expect(MAIL_TOKENS.line).toBe(blend(value("line")!, value("ground")!));
  });
});

describe("verzenden", () => {
  it("Resend krijgt afzender, ontvanger, onderwerp, HTML en tekst", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: "re_123" }), { status: 200 }));
    const t = resendTransport("re_test_sleutel", fetchMock as unknown as typeof fetch);
    const m = buildMail("login", SAMPLES.login, { appUrl: APP });
    const sent = await t.send({ from: MAIL_FROM, to: "delivered@resend.dev", subject: m.subject, html: m.html, text: m.text, kind: "login" });
    expect(sent.id).toBe("re_123");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer re_test_sleutel");
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ from: "AdSweet <hallo@adsweet.ai>", to: ["delivered@resend.dev"], subject: "Je link om in te loggen" });
    expect(body.tags).toEqual([{ name: "mail", value: "login" }]);
  });

  it("een fout van Resend komt boven", async () => {
    const t = resendTransport(
      "re_x",
      (async () => new Response(JSON.stringify({ message: "Invalid `to` field" }), { status: 422 })) as unknown as typeof fetch,
    );
    await expect(t.send({ from: MAIL_FROM, to: "x", subject: "s", html: "h", text: "t" })).rejects.toThrow(/422/);
  });

  it("de 12 mails verzonden in een testomgeving (postvak)", async () => {
    const dir = await mkdtemp(join(tmpdir(), "adsweet-mails-"));
    const t = outboxTransport(dir);
    const before = outbox().length;
    for (const kind of MAIL_KINDS as readonly MailKind[]) {
      const m = buildMail(kind, SAMPLES[kind] as never, { appUrl: APP });
      await t.send({ from: MAIL_FROM, to: "test@adsweet.voorbeeld", subject: m.subject, html: m.html, text: m.text, kind });
    }
    expect(outbox().length - before).toBe(12);
    expect((await readdir(dir)).filter((f) => f.endsWith(".html"))).toHaveLength(12);
  });
});
