"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, Input, TextButton, useToast } from "@adsweet/ui";
import { Proposal } from "@/components/ui";
import type { CampaignDetailVM } from "@/lib/server/campaigns";
import { undoChange } from "../../vandaag/actions";
import { budgetAction, pauseCampaignAction } from "../actions";

/** Pauzeren of hervatten, met Ongedaan maken in de toast. */
export function PauseButton({ id, paused }: { id: string; paused: boolean }) {
  const t = useTranslations("campaign");
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      icon={paused ? "arrow" : "pause"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await pauseCampaignAction(id, !paused);
          if (!res.ok) return;
          router.refresh();
          toast.show({
            message: paused ? t("resumedToast") : t("pausedToast"),
            undo:
              "logId" in res && res.logId
                ? () =>
                    start(async () => {
                      await undoChange(res.logId!);
                      router.refresh();
                    })
                : undefined,
          });
        })
      }
    >
      {paused ? t("resume") : t("pause")}
    </Button>
  );
}

/** Voorstel van AdSweet om het budget te verhogen. De klant beslist met één klik. */
export function ScaleProposal({ id, scale, canEdit }: { id: string; scale: NonNullable<CampaignDetailVM["scale"]>; canEdit: boolean }) {
  const t = useTranslations("campaign");
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <div className="cp-proposal">
      <Proposal />
      <span>{scale.text}</span>
      {canEdit ? (
        <Button
          arrow={false}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await budgetAction(id, scale.to, true);
              if (!res.ok) return;
              router.refresh();
              toast.show({
                message: t("scaleToast", { to: scale.toText }),
                undo: () =>
                  start(async () => {
                    await undoChange(res.logId);
                    router.refresh();
                  }),
              });
            })
          }
        >
          {scale.button}
        </Button>
      ) : null}
    </div>
  );
}

/** Tab Instellingen: het budget kan je hier aanpassen. De rest hoort bij de lopende ad set en blijft zoals hij is. */
export function SettingsList({ id, rows, budget, canEdit }: { id: string; rows: CampaignDetailVM["settings"]; budget: number | null; canEdit: boolean }) {
  const t = useTranslations("campaign");
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState<string | null>(null);
  const [value, setValue] = useState(budget ? String(budget).replace(".", ",") : "");
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const n = Number(value.replace(",", "."));
      const res = await budgetAction(id, n, false);
      if (!res.ok) return;
      setOpen(null);
      router.refresh();
      toast.show({
        message: t("settings.saved"),
        undo: () =>
          start(async () => {
            await undoChange(res.logId);
            router.refresh();
          }),
      });
    });
  return (
    <dl className="cp-settings">
      {rows.map((r) => (
        <div key={r.key} className={["cp-setting", r.warn && "cp-setting--warn"].filter(Boolean).join(" ")}>
          <dt>{r.label}</dt>
          <dd>
            <span className="cp-setting__value">{r.value}</span>
            {r.sub ? <span className="cp-setting__sub">{r.sub}</span> : null}
          </dd>
          {canEdit ? (
            <TextButton onClick={() => setOpen(open === r.key ? null : r.key)} aria-expanded={open === r.key}>
              {t("settings.edit")}
            </TextButton>
          ) : (
            <span />
          )}
          {open === r.key && r.editable ? (
            <div className="cp-setting__edit">
              <Input label={t("settings.budget")} prefix="€" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} />
              <Button arrow={false} onClick={save} disabled={pending}>
                {t("settings.save")}
              </Button>
              <Button variant="secondary" onClick={() => setOpen(null)}>
                {t("settings.cancel")}
              </Button>
            </div>
          ) : null}
          {open === r.key && !r.editable ? (
            <p className="cp-setting__note">
              <span>{t("settings.locked")}</span>
              <Link className="as-link" href={`/advertenties/toevoegen?campagne=${id}`}>
                {t("settings.lockedLink")}
              </Link>
            </p>
          ) : null}
        </div>
      ))}
    </dl>
  );
}
