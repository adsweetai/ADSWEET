"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, FeedPreview, Logo, Textarea } from "@adsweet/ui";
import type { PublicPreview } from "@/lib/server/campaign-changes";
import { previewFeedbackAction } from "@/app/p/actions";

type Item = PublicPreview["ads"][number];

/** De pagina die je vennoot ziet: elke advertentie met Goedgekeurd of Opmerking. Zonder account. */
export function PreviewBoard({ data, interactive }: { data: PublicPreview; interactive: boolean }) {
  const t = useTranslations("previewLink");
  return (
    <div className="pl-frame">
      <span className="pl-frame__head">
        <Logo />
        <span className="as-muted">{t("asks", { name: data.asker })}</span>
      </span>
      <div className="pl-ads">
        {data.ads.map((a) => (
          <AdReview key={a.id} a={a} data={data} interactive={interactive} />
        ))}
      </div>
    </div>
  );
}

function AdReview({ a, data, interactive }: { a: Item; data: PublicPreview; interactive: boolean }) {
  const t = useTranslations("previewLink");
  const [status, setStatus] = useState(a.status);
  const [note, setNote] = useState(a.note);
  const [noting, setNoting] = useState(a.status === "opmerking");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const send = (s: Item["status"], n = "") =>
    start(async () => {
      if (!interactive) return;
      const res = await previewFeedbackAction(data.code, a.id, s, n);
      if (res.ok) setSaved(true);
    });
  const ok = status === "goedgekeurd";
  return (
    <div className={["pl-ad", ok && "pl-ad--ok"].filter(Boolean).join(" ")}>
      <span className="pl-ad__name">{a.title}</span>
      <FeedPreview
        width={220}
        c={{
          page: data.biz.name,
          pageInitial: data.biz.name.slice(0, 1).toUpperCase(),
          pageColor: data.biz.color,
          text: a.text,
          headline: a.headline,
          cta: a.cta,
          media: { kind: a.kind, placeholder: t(a.kind === "video" ? "videoPh" : "photoPh") },
        }}
      />
      <div className="pl-ad__buttons">
        <button
          type="button"
          className="pl-btn"
          aria-pressed={ok}
          disabled={!interactive || pending}
          onClick={() => {
            const next = ok ? null : "goedgekeurd";
            setStatus(next);
            setNoting(false);
            send(next);
          }}
        >
          {t("approve")}
        </button>
        <button type="button" className="pl-btn" aria-pressed={noting} disabled={!interactive || pending} onClick={() => setNoting(true)}>
          {t("note")}
        </button>
      </div>
      {noting ? (
        <>
          <Textarea label={t("note")} rows={2} placeholder={t("notePh")} value={note} readOnly={!interactive} onChange={(e) => setNote(e.target.value)} />
          {interactive ? (
            <Button
              variant="secondary"
              disabled={pending || !note.trim()}
              onClick={() => {
                setStatus("opmerking");
                send("opmerking", note);
              }}
            >
              {t("save")}
            </Button>
          ) : null}
        </>
      ) : null}
      {saved ? (
        <span role="status" className="as-small as-muted">
          {t("thanks", { name: data.asker })}
        </span>
      ) : null}
    </div>
  );
}
