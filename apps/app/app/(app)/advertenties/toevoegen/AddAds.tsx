"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Icon, Select, useToast } from "@adsweet/ui";
import { Dropzone } from "@/components/ads/Dropzone";
import { upload, type Uploaded } from "@/components/ads/upload";
import { LinkButton } from "@/components/LinkButton";
import { PlaybookWarning } from "@/components/ui";
import type { MakerContext } from "@/lib/server/campaigns";

/** Nieuwe advertenties toevoegen (App.dc.html#advertenties-toevoegen). */
export function AddAds({ m, initial }: { m: MakerContext; initial: string | null }) {
  const t = useTranslations("addAds");
  const toast = useToast();
  const [campaignId, setCampaignId] = useState(initial ?? m.campaigns[0]?.id ?? "");
  const [where, setWhere] = useState<"nieuw" | "bestaand">("nieuw");
  const [ok, setOk] = useState(false);
  const [files, setFiles] = useState<Uploaded[]>([]);
  const [busy, setBusy] = useState(false);
  const campaign = m.campaigns.find((c) => c.id === campaignId);
  const adSet = campaign?.adSets[0] ?? null;
  const [newTitle, newSub] = t.raw("new") as string[];
  const [exTitle] = t.raw("existing") as string[];

  const onFiles = async (list: File[]) => {
    setBusy(true);
    try {
      const done: Uploaded[] = [];
      for (const f of list) done.push(await upload(f));
      setFiles((x) => [...x, ...done]);
    } catch {
      toast.show({ message: t("uploadError") });
    } finally {
      setBusy(false);
    }
  };

  const params = new URLSearchParams({ campagne: campaignId });
  if (where === "bestaand" && adSet) {
    params.set("adset", adSet.id);
    if (ok) params.set("ok", "1");
  }
  const ids = files.map((f) => f.id).filter(Boolean);
  if (ids.length) params.set("media", ids.join(","));
  const blocked = !campaign || (where === "bestaand" && !ok);

  if (!m.campaigns.length)
    return (
      <div className="cp cp--narrow">
        <p className="wz-note">{t("noCampaign")}</p>
        <LinkButton href="/campagnes/nieuw" variant="primary">
          {t("startFirst")}
        </LinkButton>
      </div>
    );

  return (
    <div className="cp cp--narrow">
      <div style={{ maxWidth: 420 }}>
        <Select
          label={t("campaign")}
          value={campaignId}
          options={m.campaigns.map((c) => ({ value: c.id, label: c.name }))}
          onChange={(e) => setCampaignId(e.target.value)}
        />
      </div>
      <Dropzone title={t("drop")} sub={t("dropSub")} multiple big onFiles={onFiles} disabled={busy} />
      {busy || files.length ? (
        <p role="status" className="as-small as-muted" style={{ margin: 0 }}>
          {busy ? t("uploading") : t("files", { n: files.length })}
        </p>
      ) : null}
      <div role="radiogroup" aria-label={t("where")} className="up-radios">
        <button type="button" role="radio" aria-checked={where === "nieuw"} className="up-radio" onClick={() => setWhere("nieuw")}>
          <b>{newTitle}</b>
          <span>{newSub}</span>
        </button>
        {adSet ? (
          <button
            type="button"
            role="radio"
            aria-checked={where === "bestaand"}
            className="up-radio up-radio--warn"
            onClick={() => {
              setWhere("bestaand");
              setOk(false);
            }}
          >
            <b>{exTitle}</b>
            <span>{adSet.since ? t("existingSub", { adset: adSet.name.split(" · ")[0], date: adSet.since }) : adSet.name}</span>
          </button>
        ) : null}
      </div>
      {where === "bestaand" && !ok ? <PlaybookWarning reason={t("warn")} onProceed={() => setOk(true)} /> : null}
      <aside className="wz-note" style={{ display: "flex", gap: 10, fontSize: 14 }}>
        <span style={{ display: "flex", color: "var(--ink-muted)", marginTop: 2 }}>
          <Icon name="bulb" size={16} />
        </span>
        <span>
          <b style={{ fontWeight: 500 }}>{t("tipTitle")}</b> {t("tip")}
        </span>
      </aside>
      <p className="as-small as-muted" style={{ margin: 0 }}>
        {t("frequency")}
      </p>
      {blocked ? null : (
        <LinkButton href={`/advertenties/maken?${params.toString()}`} variant="primary" arrow style={{ alignSelf: "flex-start" }}>
          {t("next")}
        </LinkButton>
      )}
    </div>
  );
}
