import "server-only";
import { getTranslations } from "next-intl/server";
import { must } from "@adsweet/db";
import { formatEuro, formatLongDate } from "@adsweet/ui";
import { nowIso } from "@/lib/clock";
import { getDb } from "./auth";
import { inAccount, isLive } from "./campaigns";
import { getContext, type AppContext } from "./context";

// Academy (App.dc.html#academy, #les, #certificaat): vijf trajecten met korte lessen. Wat je las, staat in
// academy_progress. De titels staan in nl.json; een les heet `${traject}-${nummer}`, bijvoorbeeld basis-1.

interface TrackText {
  key: string;
  t: string;
  lessons: string[];
}

export interface LessonRef {
  id: string;
  title: string;
  read: boolean;
}

export interface TrackVM {
  n: string;
  key: string;
  title: string;
  done: number;
  lessons: LessonRef[];
}

export const lessonId = (track: string, i: number) => `${track}-${i + 1}`;

async function tracksText(): Promise<TrackText[]> {
  const t = await getTranslations("academy");
  return t.raw("tracks") as TrackText[];
}

async function readLessons(userId: string): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = must(await db.from("academy_progress").select().eq("user_id", userId));
  return new Map(rows.map((r) => [r.lesson, r.done_at]));
}

export async function loadTracks(ctx: AppContext): Promise<TrackVM[]> {
  const [tracks, read] = await Promise.all([tracksText(), readLessons(ctx.user.id)]);
  return tracks.map((tr, i) => {
    const lessons = tr.lessons.map((title, j) => ({ id: lessonId(tr.key, j), title, read: read.has(lessonId(tr.key, j)) }));
    return { n: String(i + 1).padStart(2, "0"), key: tr.key, title: tr.t, done: lessons.filter((l) => l.read).length, lessons };
  });
}

export interface LessonVM {
  id: string;
  title: string;
  track: { n: string; title: string };
  index: number;
  total: number;
  read: boolean;
  next: string | null;
  content: { lead: string; paras: [string, string][] } | null;
  quiz: { q: string; options: [string, string][]; right: string; yes: string; no: string } | null;
  inAccount: { text: string; href: string; btn: string };
}

export async function loadLesson(ctx: AppContext, id: string): Promise<LessonVM | null> {
  const t = await getTranslations("academy");
  const tracks = await tracksText();
  const m = /^([a-z]+)-(\d+)$/.exec(id);
  if (!m) return null;
  const ti = tracks.findIndex((tr) => tr.key === m[1]);
  const index = Number(m[2]) - 1;
  const track = tracks[ti];
  if (!track || index < 0 || index >= track.lessons.length) return null;
  const read = await readLessons(ctx.user.id);
  const content = (t.raw("content") as Record<string, { lead: string; paras: [string, string][]; quiz?: LessonVM["quiz"] }>)[id] ?? null;
  const nextInTrack = index + 1 < track.lessons.length ? lessonId(track.key, index + 1) : null;
  const nextTrack = tracks[ti + 1];
  return {
    id,
    title: track.lessons[index],
    track: { n: String(ti + 1).padStart(2, "0"), title: track.t },
    index,
    total: track.lessons.length,
    read: read.has(id),
    next: nextInTrack ?? (nextTrack ? lessonId(nextTrack.key, 0) : null),
    content: content ? { lead: content.lead, paras: content.paras } : null,
    quiz: content?.quiz ?? null,
    inAccount: await inAccountText(ctx),
  };
}

/** "In jouw account": hoe je eigen campagne opgebouwd is, uit je eigen data. */
async function inAccountText(ctx: AppContext): Promise<LessonVM["inAccount"]> {
  const t = await getTranslations("academy");
  const db = await getDb();
  const [campaigns, sets, ads] = await Promise.all([
    db.from("campaigns").select().eq("organization_id", ctx.org.id).then(must),
    db.from("ad_sets").select("id, campaign_id, status").eq("organization_id", ctx.org.id).then(must),
    db.from("ads").select("id, campaign_id, status").eq("organization_id", ctx.org.id).then(must),
  ]);
  const live = campaigns.filter((c) => inAccount(ctx, c) && isLive(c));
  const main = live.find((c) => c.kind === "vast") ?? live[0];
  if (!main) return { text: t("inAccountNone"), href: "/campagnes/nieuw", btn: t("inAccountNew") };
  const ids = new Set(live.map((c) => c.id));
  const n = {
    campaigns: live.length,
    sets: sets.filter((s) => ids.has(s.campaign_id) && s.status !== "afgelopen").length,
    ads: ads.filter((a) => ids.has(a.campaign_id) && a.status !== "uit").length,
  };
  const text = main.budget_level === "campagne" ? t("inAccount", { ...n, budget: formatEuro(Number(main.daily_budget)) }) : t("inAccountAdset", n);
  return { text, href: `/campagnes/${main.id}`, btn: t("inAccountBtn") };
}

/** Een les is gelezen (knop onderaan, of een juist antwoord op de controlevraag). */
export async function markLessonRead(id: string) {
  const ctx = await getContext();
  if (!(await loadLesson(ctx, id))) return;
  const db = await getDb();
  await db.from("academy_progress").upsert({ user_id: ctx.user.id, lesson: id, done_at: nowIso() }, { onConflict: "user_id,lesson" });
}

export interface CertificateVM {
  name: string;
  n: string;
  track: string;
  count: number;
  date: string;
}

/** Een certificaat per afgerond traject, met de datum van de laatste les. */
export async function loadCertificates(ctx: AppContext): Promise<CertificateVM[]> {
  const [tracks, read] = await Promise.all([tracksText(), readLessons(ctx.user.id)]);
  const name = ctx.profile.full_name || ctx.profile.first_name || ctx.org.name;
  return tracks.flatMap((tr, i) => {
    const dates = tr.lessons.map((_, j) => read.get(lessonId(tr.key, j)));
    if (dates.some((d) => !d)) return [];
    const last = (dates as string[]).sort().at(-1)!.slice(0, 10);
    return [{ name, n: String(i + 1).padStart(2, "0"), track: tr.t, count: tr.lessons.length, date: formatLongDate(last, true) }];
  });
}
