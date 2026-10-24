"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, useToast } from "@adsweet/ui";
import { toursResetAction } from "@/app/(app)/dot-actions";

/** Hulp: "Geef mij opnieuw uitleg" met de drie rondleidingen, en alles opnieuw bij je volgende bezoek. */
export function TourCard({ campaignId }: { campaignId: string | null }) {
  const t = useTranslations("tours");
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <div className="tour-help" data-theme="light">
      <span className="tour-help__dots" aria-hidden="true">
        <span className="as-dotfill--roos" />
        <span className="as-dotfill--citroen" />
        <span className="as-dotfill--munt" />
      </span>
      <span className="tour-help__text">
        <b>{t("helpTitle")}</b>
        <span>{t("helpText")}</span>
      </span>
      <div className="dot-actions">
        <Button variant="secondary" onClick={() => router.push("/vandaag?rondleiding=app")}>
          {t("startApp")}
        </Button>
        {campaignId ? (
          <Button variant="secondary" onClick={() => router.push(`/campagnes/${campaignId}?rondleiding=campagne`)}>
            {t("startCampaign")}
          </Button>
        ) : null}
        <Button variant="secondary" onClick={() => router.push("/campagnes/nieuw?rondleiding=wizard")}>
          {t("startWizard")}
        </Button>
      </div>
      <button
        type="button"
        className="as-textbtn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await toursResetAction();
            toast.show({ message: t("resetDone") });
          })
        }
      >
        {t("reset")}
      </button>
    </div>
  );
}
