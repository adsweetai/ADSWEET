import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildMail } from "../src/index";

// Supabase Auth stuurt de link om in te loggen zelf (via Resend als SMTP). Dit script maakt die mail uit hetzelfde
// sjabloon: supabase/templates/magic_link.html, met {{ .ConfirmationURL }} als link. Zie supabase/config.toml.

const MARK = "https://link.voorbeeld/inloggen";
const m = buildMail("login", { url: MARK }, { appUrl: "{{ .SiteURL }}" });
const html = m.html.replaceAll(MARK, "{{ .ConfirmationURL }}");
const dir = join(process.cwd(), "..", "..", "supabase", "templates");
await mkdir(dir, { recursive: true });
await writeFile(join(dir, "magic_link.html"), html, "utf8");
console.log(`supabase/templates/magic_link.html geschreven (onderwerp: ${m.subject}).`);
