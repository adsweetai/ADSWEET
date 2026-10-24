import M from "./nl.json";
import { MAIL_TOKENS as C } from "./tokens";

// Het sjabloon van alle mails (Mails.dc.html): hoogstens 600px breed, tabellen voor de opmaak, inline stijlen en
// altijd licht. Daarnaast een tekstversie voor wie geen HTML toont.

export interface MailContent {
  subject: string;
  /** Korte voorvertoning in de inbox; standaard de eerste alinea. */
  preheader?: string;
  title: string;
  body: string[];
  /** Kerncijfers als tegels; de laatste krijgt een rand in inkt (zoals de EuroTegel). */
  tile?: { k: string; v: string }[];
  button: { label: string; href: string };
  small?: string;
}

export interface RenderedMail {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const font = `font-family:${C.font.replace(/"/g, "'")};`;

export function renderMail(c: MailContent, opts: { appUrl: string }): RenderedMail {
  const settings = `${opts.appUrl}/instellingen/meldingen`;
  const [before, sweet, after] = M.footer.slogan;
  const row = (inner: string, pad = "22px 40px 0") => `<tr><td style="padding:${pad};${font}">${inner}</td></tr>`;
  const p = (s: string) => row(`<p style="margin:0;font-size:16px;line-height:1.55;color:${C.ink};">${esc(s)}</p>`);
  const tile = c.tile?.length
    ? row(
        `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border:1px solid ${C.line};font-size:14px;"><tr>${c.tile
          .map((x, i, a) => {
            const last = i === a.length - 1;
            return `<td style="padding:12px 14px;${i ? `border-left:1px solid ${C.line};` : ""}${last ? `outline:1px solid ${C.ink};` : ""}${font}"><span style="display:block;font-size:12px;color:${C.inkMuted};">${esc(x.k)}</span><b style="font-size:20px;font-weight:${last ? 500 : 400};color:${C.ink};">${esc(x.v)}</b></td>`;
          })
          .join("")}</tr></table>`,
      )
    : "";
  const button = row(
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-radius:999px;background:${C.ink};"><a href="${esc(c.button.href)}" style="display:inline-block;padding:13px 22px;border-radius:999px;background:${C.ink};color:${C.ground};font-size:15px;font-weight:500;text-decoration:none;${font}">${esc(c.button.label)}</a></td></tr></table>`,
  );
  const small = c.small ? row(`<p style="margin:0;font-size:13.5px;line-height:1.5;color:${C.inkMuted};">${esc(c.small)}</p>`) : "";
  const footer = row(
    `<div style="border-top:1px solid ${C.line};padding-top:20px;">
<p style="margin:0 0 6px;font-size:22px;font-weight:300;letter-spacing:-0.03em;color:${C.inkAccent};">${esc(before)}<span style="color:${C.robijn};">${esc(sweet)}</span>${esc(after)}</p>
<p style="margin:0 0 6px;font-size:12.5px;color:${C.inkMuted};">${esc(M.footer.company)}</p>
<p style="margin:0;font-size:12.5px;color:${C.inkMuted};"><a href="${esc(settings)}" style="color:${C.inkMuted};">${esc(M.footer.settings)}</a> · <a href="${esc(settings)}" style="color:${C.inkMuted};">${esc(M.footer.unsubscribe)}</a></p>
</div>`,
    "38px 40px 40px",
  );
  const preheader = c.preheader ?? c.body[0] ?? c.title;
  const html = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${esc(c.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${C.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ground};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:${C.ground};border:1px solid ${C.line};border-radius:4px;">
${row(`<span style="font-size:22px;font-weight:500;letter-spacing:-0.04em;color:${C.ink};" role="img" aria-label="${esc(M.logoAlt)}">adsweet<span style="color:${C.robijn};">.</span></span>`, "40px 40px 0")}
${row(`<h1 style="margin:0;font-size:28px;font-weight:500;letter-spacing:-0.03em;line-height:1.15;color:${C.ink};">${esc(c.title)}</h1>`, "30px 40px 0")}
${c.body.map(p).join("\n")}
${tile}
${button}
${small}
${footer}
</table>
</td></tr>
</table>
</body>
</html>
`;
  const text = [
    c.title,
    "",
    ...c.body.flatMap((x) => [x, ""]),
    ...(c.tile?.length ? [c.tile.map((x) => `${x.k}: ${x.v}`).join(" · "), ""] : []),
    `${c.button.label}: ${c.button.href}`,
    ...(c.small ? ["", c.small] : []),
    "",
    "--",
    M.footer.slogan.join(""),
    M.footer.company,
    `${M.footer.settings}: ${settings}`,
  ].join("\n");
  return { subject: c.subject, html, text };
}
