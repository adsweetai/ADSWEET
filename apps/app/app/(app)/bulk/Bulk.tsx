"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Icon, Loading, PhasePill, Select, Tag, useToast, type Phase } from "@adsweet/ui";
import { Dropzone } from "@/components/ads/Dropzone";
import { nameFromFile, upload } from "@/components/ads/upload";
import type { MakerContext } from "@/lib/server/campaigns";
import { bulkLaunchAction } from "../campagnes/actions";

interface Row {
  file: string;
  mediaId: string | null;
  kind: "foto" | "video";
  phase: Phase;
  text: string;
  headline: string;
  cta: string;
}

const PHASES: Phase[] = ["top", "middle", "bottom"];

/** Bulk launch (App.dc.html#bulk): alles in nieuwe ad sets van vijf, in één bewerkbare tabel. */
export function Bulk({ m, demo }: { m: MakerContext; demo: boolean }) {
  const t = useTranslations("bulk");
  const ta = useTranslations("adMaker");
  const router = useRouter();
  const toast = useToast();
  const [campaignId, setCampaignId] = useState(m.campaigns[0]?.id ?? "");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const campaign = m.campaigns.find((c) => c.id === campaignId);
  const ctas = ta.raw("ctas") as string[];
  const leads = m.goalType === "aanvragen";
  const ctaFor = (p: Phase) => (p === "bottom" ? (leads ? ctas[2] : ctas[0]) : ctas[1]);
  const rowFor = (file: string, kind: "foto" | "video", mediaId: string | null, i: number): Row => {
    const phase = PHASES[i % 3];
    return { file, mediaId, kind, phase, text: m.texts.length ? m.texts[i % m.texts.length] : "", headline: m.biz.name, cta: ctaFor(phase) };
  };
  const base = campaign?.adSetCount ?? 1;
  const setOf = (i: number) => `AS${base + 1 + Math.floor(i / 5)}`;
  const names = [...new Set(rows.map((_, i) => setOf(i)))];
  const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} ${t("and")} ${names.at(-1)}` : (names[0] ?? "");

  const onFiles = async (files: File[]) => {
    setBusy(true);
    try {
      const done: Row[] = [];
      for (const f of files) {
        const u = await upload(f);
        done.push(rowFor(u.name, u.kind, u.id, rows.length + done.length));
      }
      setRows((r) => [...r, ...done]);
    } catch {
      toast.show({ message: ta("uploadError") });
    } finally {
      setBusy(false);
    }
  };
  const demoFill = () =>
    setRows(
      Array.from({ length: 12 }, (_, i) =>
        rowFor(t("demoFile", { n: String(i + 1).padStart(2, "0"), ext: i % 4 === 3 ? "mp4" : "jpg" }), i % 4 === 3 ? "video" : "foto", null, i),
      ),
    );
  const edit = (i: number, p: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const launch = () =>
    start(async () => {
      const res = await bulkLaunchAction({
        campaignId,
        ads: rows.map((r) => ({
          name: nameFromFile(r.file),
          kind: r.kind,
          phase: r.phase,
          primaryText: r.text,
          variants: [r.text],
          headline: r.headline,
          description: m.description,
          cta: r.cta,
          mediaId: r.mediaId,
        })),
      });
      if (!res.ok) return toast.show({ message: ta("error") });
      toast.show({ message: t("toast", { n: res.n, sets: res.sets }) });
      router.push(`/campagnes/${campaignId}`);
    });

  return (
    <div className="cp">
      <p className="cp-intro">{t("intro")}</p>
      {m.campaigns.length > 1 ? (
        <div style={{ maxWidth: 420 }}>
          <Select
            label={t("campaign")}
            value={campaignId}
            options={m.campaigns.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(e) => setCampaignId(e.target.value)}
          />
        </div>
      ) : null}
      {!campaign ? <p className="wz-note">{t("noCampaign")}</p> : null}
      {campaign ? <Dropzone title={t("drop")} multiple big onFiles={onFiles} disabled={busy} /> : null}
      {busy ? <Loading>{ta("uploading")}</Loading> : null}
      {demo && campaign && !rows.length ? (
        <button type="button" className="cp-demo" onClick={demoFill}>
          {t("demo")}
        </button>
      ) : null}
      {rows.length ? (
        <>
          <div className="as-tablewrap">
            <table className="as-table bk-table">
              <thead>
                <tr>
                  <th>{t("cols.file")}</th>
                  <th>{t("cols.phase")}</th>
                  <th>{t("cols.text")}</th>
                  <th>{t("cols.headline")}</th>
                  <th>{t("cols.cta")}</th>
                  <th>{t("cols.adset")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>
                      <span className="bk-file">
                        <span className="as-thumb as-hatch" aria-hidden="true">
                          <Icon name={r.kind === "video" ? "video" : "image"} size={14} />
                        </span>
                        {r.file}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="as-textbtn"
                        aria-label={t("phaseNext")}
                        onClick={() => edit(i, { phase: PHASES[(PHASES.indexOf(r.phase) + 1) % 3] })}
                      >
                        <PhasePill phase={r.phase} size="sm" />
                      </button>
                    </td>
                    <td>
                      <input type="text" value={r.text} aria-label={t("cols.text")} onChange={(e) => edit(i, { text: e.target.value })} />
                    </td>
                    <td>
                      <input type="text" value={r.headline} aria-label={t("cols.headline")} onChange={(e) => edit(i, { headline: e.target.value })} />
                    </td>
                    <td>{r.cta}</td>
                    <td>{setOf(i)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="am-done">
            <span className="as-muted">{t("summary", { n: rows.length, sets: names.length, names: list })}</span>
            <Button arrow onClick={launch} disabled={pending}>
              {t("live")}
            </Button>
          </div>
        </>
      ) : null}
      <div className="bk-later">
        <div>
          <span>{t("agency")}</span>
          <Tag>Agency</Tag>
        </div>
        <div>
          <span>{t("sheets")}</span>
          <Tag>Later</Tag>
        </div>
      </div>
    </div>
  );
}
