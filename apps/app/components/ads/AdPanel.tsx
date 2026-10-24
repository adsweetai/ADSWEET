"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, FeedPreview, IconButton, Input, Pills, PhasePill, ReelPreview, StoryPreview, Textarea, useToast } from "@adsweet/ui";
import { Label } from "@/components/ui";
import type { AdPanelVM } from "@/lib/server/campaigns";
import { adStatusAction, duplicateAdAction } from "@/app/(app)/campagnes/actions";
import { undoChange } from "@/app/(app)/vandaag/actions";

type Place = "feed" | "stories" | "reels";

/** Het href van de huidige pagina zonder ?advertentie=. */
export function useCloseHref() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const next = new URLSearchParams(sp.toString());
  next.delete("advertentie");
  const q = next.toString();
  return q ? `${pathname}?${q}` : pathname;
}

/** Advertentiepaneel (App.dc.html, ap): preview per plaatsing, teksten, cijfers, uitleg bij het label, Afzetten. */
export function AdPanel({ vm, canEdit }: { vm: AdPanelVM; canEdit: boolean }) {
  const t = useTranslations("adPanel");
  const router = useRouter();
  const toast = useToast();
  const closeHref = useCloseHref();
  const [place, setPlace] = useState<Place>("feed");
  const [variant, setVariant] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const dialog = useRef<HTMLDivElement>(null);
  const close = () => router.replace(closeHref, { scroll: false });

  useEffect(() => {
    dialog.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && router.replace(closeHref, { scroll: false });
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeHref, router]);

  const text = vm.texts[variant] ?? "";
  const content = {
    page: vm.biz.name,
    pageInitial: vm.biz.initial,
    pageColor: vm.biz.color,
    text,
    headline: vm.headline,
    cta: vm.cta,
    media: { src: vm.thumb ?? undefined, kind: vm.kind, placeholder: `${vm.kind === "video" ? t("video") : t("photo")} ${place === "feed" ? "4:5" : "9:16"}` },
  };
  const off = vm.status === "uit";

  const setStatus = (value: "actief" | "uit") =>
    start(async () => {
      const res = await adStatusAction(vm.id, value);
      setConfirming(false);
      if (!res.ok) return;
      if (value === "uit") router.replace(closeHref, { scroll: false });
      else router.refresh();
      toast.show({
        message: value === "uit" ? t("offToast", { name: vm.name }) : t("onToast", { name: vm.name }),
        undo: res.logId
          ? () =>
              start(async () => {
                await undoChange(res.logId!);
                router.refresh();
              })
          : undefined,
      });
    });

  const duplicate = () =>
    start(async () => {
      const res = await duplicateAdAction(vm.id);
      if (!res.ok) return;
      router.refresh();
      toast.show({ message: t("dupToast") });
    });

  return (
    <div className="ap-scrim" onClick={close}>
      <div
        ref={dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={vm.title}
        className="ap"
        onClick={(e) => e.stopPropagation()}
        aria-busy={pending}
      >
        <header className="ap-head">
          <span className="ap-head__text">
            <b>{vm.title}</b>
            <span className="ap-head__chips">
              <PhasePill phase={vm.phase} size="sm" />
              <Label kind={vm.label} size="sm" />
              <span>{vm.kind === "video" ? t("video") : t("photo")}</span>
            </span>
          </span>
          <IconButton icon="x" label={t("close")} onClick={close} />
        </header>
        <div className="ap-body">
          <Pills
            label={t("placesLabel")}
            value={place}
            mode="radio"
            options={(["feed", "stories", "reels"] as Place[]).map((p) => ({ value: p, label: t(`places.${p}`) }))}
            onChange={setPlace}
          />
          <div className="ap-preview">
            {place === "feed" ? (
              <FeedPreview c={content} width={240} />
            ) : place === "stories" ? (
              <StoryPreview c={content} width={200} />
            ) : (
              <ReelPreview c={content} width={200} />
            )}
          </div>

          <div className="ap-texts">
            <Textarea label={t("primary")} value={text} readOnly rows={3} />
            {vm.texts.length > 1 ? (
              <Pills
                label={t("primary")}
                value={String(variant)}
                options={vm.texts.map((_, i) => ({ value: String(i), label: t("variant", { n: i + 1 }) }))}
                onChange={(v) => setVariant(Number(v))}
              />
            ) : null}
            <div className="am-fields">
              <Input label={t("headline")} value={vm.headline} readOnly />
              <Input label={t("description")} value={vm.description} readOnly />
              <Input label={t("cta")} value={vm.cta} readOnly />
            </div>
            <p className="ap-note">{t("liveNote")}</p>
          </div>

          <dl className="ap-metrics">
            {vm.metrics.map((m) => (
              <div key={m.k}>
                <dt>{m.k}</dt>
                <dd className={m.muted ? "ap-muted" : undefined}>{m.v}</dd>
              </div>
            ))}
          </dl>
          <div className="ap-why">
            <b>{t("whyTitle")}</b>
            <span>{vm.why}</span>
          </div>
          <div className="ap-score">
            <span>{t("score")}</span>
            <span>{t("scoreValue")}</span>
          </div>

          {confirming ? (
            <div role="alert" className="ap-confirm">
              <b>{t("confirmTitle", { name: vm.name })}</b>
              <span className="as-muted">{t("confirmText")}</span>
              <div className="cp-actions">
                <Button arrow={false} onClick={() => setStatus("uit")} disabled={pending}>
                  {t("confirmYes")}
                </Button>
                <Button variant="secondary" onClick={() => setConfirming(false)}>
                  {t("cancel")}
                </Button>
              </div>
            </div>
          ) : null}
          {canEdit ? (
            <div className="cp-actions">
              {off ? (
                <Button variant="secondary" onClick={() => setStatus("actief")} disabled={pending}>
                  {t("on")}
                </Button>
              ) : (
                <Button variant="secondary" onClick={() => setConfirming(true)} disabled={pending || confirming}>
                  {t("off")}
                </Button>
              )}
              <Button variant="secondary" onClick={duplicate} disabled={pending}>
                {t("duplicate")}
              </Button>
            </div>
          ) : null}
          <span className="as-small as-muted">{t("duplicateNote")}</span>
        </div>
      </div>
    </div>
  );
}
