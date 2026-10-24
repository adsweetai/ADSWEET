"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, useToast } from "@adsweet/ui";
import { runJobsAction, sendSamplesAction } from "./actions";

interface Mail {
  kind: string;
  label: string;
  subject: string;
  html: string;
}

interface Sent {
  id: string;
  to: string;
  subject: string;
  kind: string;
  at: string;
  html: string;
}

/** Links de 12 mails, rechts de mail zoals ze in de mailbox aankomt; onderaan wat er verstuurd is. */
export function MailsViewer({ mails, sent, transport, me }: { mails: Mail[]; sent: Sent[]; transport: "resend" | "outbox"; me: string }) {
  const t = useTranslations("mailsPage");
  const toast = useToast();
  const router = useRouter();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cur = mails[i];
  const shown = open ? sent.find((s) => s.id === open) : null;
  return (
    <div className="ml-mails">
      <p className="ml-mails__note">{t("note", { transport: t(`transport.${transport}`) })}</p>
      <div className="ml-mails__grid">
        <nav aria-label={t("listAria")} className="ml-mails__list">
          {mails.map((m, j) => (
            <button key={m.kind} type="button" aria-current={j === i && !shown ? "true" : undefined} onClick={() => (setI(j), setOpen(null))}>
              <span>{String(j + 1).padStart(2, "0")}</span>
              {m.label}
            </button>
          ))}
        </nav>
        <section className="ml-mails__preview" aria-label={t("previewAria")}>
          <div className="ml-mails__meta">
            <span>{t("from")}</span>
            <span>
              {t("subject")} <b>{shown ? shown.subject : cur.subject}</b>
            </span>
            {shown ? <span>{t("to", { to: shown.to })}</span> : null}
          </div>
          <iframe title={shown ? shown.subject : cur.subject} srcDoc={shown ? shown.html : cur.html} className="ml-mails__frame" sandbox="" />
        </section>
      </div>
      <div className="ml-mails__actions">
        <Button
          arrow={false}
          disabled={pending}
          onClick={() =>
            start(async () => {
              const n = await sendSamplesAction();
              toast.show({ message: t("sentAll", { n, to: me }) });
              router.refresh();
            })
          }
        >
          {t("sendAll")}
        </Button>
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await runJobsAction();
              if (res) toast.show({ message: t("jobsDone", { trial: res.trial, action: res.action, weekly: res.weekly }) });
              router.refresh();
            })
          }
        >
          {t("runJobs")}
        </Button>
      </div>
      <section className="ml-mails__sent" aria-labelledby="ml-sent">
        <h2 id="ml-sent">{t("sentTitle", { n: sent.length })}</h2>
        {sent.length ? (
          <div className="as-tablewrap">
            <table className="as-table">
              <thead>
                <tr>
                  {(t.raw("cols") as string[]).map((c) => (
                    <th key={c} scope="col">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sent.map((s) => (
                  <tr key={s.id}>
                    <td>{s.at}</td>
                    <td>{s.to}</td>
                    <td>{s.subject}</td>
                    <td>
                      <button type="button" className="as-textbtn" onClick={() => setOpen(s.id)} aria-label={t("openAria", { subject: s.subject, to: s.to })}>
                        {t("open")}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="as-muted">{t("noneSent")}</p>
        )}
      </section>
    </div>
  );
}
