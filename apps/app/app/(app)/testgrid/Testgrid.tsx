"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, ChoiceCards, Input, Select, useToast } from "@adsweet/ui";
import type { MakerContext } from "@/lib/server/campaigns";
import { testgridAction } from "../campagnes/actions";

type What = "koppen" | "beelden" | "regio" | "plaats" | "interesses";

/** Testgrid (App.dc.html#testgrid): één ding testen in een nieuwe ad set. Interesses kan je niet testen. */
export function Testgrid({ m }: { m: MakerContext }) {
  const t = useTranslations("testgrid");
  const router = useRouter();
  const toast = useToast();
  const [what, setWhat] = useState<What>("koppen");
  const [campaignId, setCampaignId] = useState(m.campaigns[0]?.id ?? "");
  const [vars, setVars] = useState<string[]>([m.headline, "", ""]);
  const [pending, start] = useTransition();
  const filled = vars.map((v) => v.trim()).filter(Boolean);
  const go = () =>
    start(async () => {
      if (what === "interesses") return;
      const res = await testgridAction({ campaignId, what, variants: filled });
      if (!res.ok) return toast.show({ message: t("error") });
      toast.show({ message: t("toast") });
      router.push(`/campagnes/${campaignId}`);
    });
  return (
    <div className="cp cp--narrow">
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
      <ChoiceCards
        label={t("what")}
        value={what}
        options={(["koppen", "beelden", "regio", "plaats", "interesses"] as What[]).map((k) => {
          const [title, sub] = t.raw(`options.${k}`) as string[];
          return { value: k, title, sub, disabled: k === "interesses" };
        })}
        onChange={setWhat}
      />
      <div className="tg-vars">
        {vars.map((v, i) => (
          <Input
            key={i}
            label={t("variant", { n: i + 1 })}
            value={v}
            placeholder={t(`placeholder.${what === "interesses" ? "koppen" : what}`)}
            onChange={(e) => setVars((x) => x.map((y, j) => (j === i ? e.target.value : y)))}
          />
        ))}
      </div>
      {filled.length < 2 ? (
        <p className="as-small as-muted" style={{ margin: 0 }}>
          {t("needTwo")}
        </p>
      ) : null}
      <Button arrow onClick={go} disabled={pending || filled.length < 2 || !campaignId} style={{ alignSelf: "flex-start" }}>
        {t("start")}
      </Button>
    </div>
  );
}
