"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, DotCharacter, Icon, IconButton, Loader, useToast } from "@adsweet/ui";
import type { DotMessage, Intent } from "@/lib/server/dot";
import { dotApplyAction, dotAskAction, dotDeclineAction, dotHistoryAction } from "@/app/(app)/dot-actions";
import { undoChange } from "@/app/(app)/vandaag/actions";
import "./dot.css";

const PILLS: Intent[] = ["week", "xmas", "roas", "which"];
const BALLOON_KEY = "as-dot-ballon";

/** Vraag Dot iets van elders in de app: window.dispatchEvent(new CustomEvent("dot:ask", { detail: "week" })). */
export function askDot(intent: Intent) {
  window.dispatchEvent(new CustomEvent("dot:ask", { detail: intent }));
}

/** Dot rechtsonder (vanaf Pro): knop, ballon hoogstens één keer per dag, en het paneel van 420px. */
export function DotLauncher({ balloon, account, firstName }: { balloon: string | null; account: string; firstName: string }) {
  const t = useTranslations("dot");
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<DotMessage[] | null>(null);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState("");
  const [showBalloon, setShowBalloon] = useState(false);
  const [, start] = useTransition();
  const list = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!balloon) return;
    const day = new Date().toISOString().slice(0, 10);
    try {
      if (localStorage.getItem(BALLOON_KEY) === day) return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setShowBalloon(true), 1800);
    return () => window.clearTimeout(timer);
  }, [balloon]);
  const dismissBalloon = () => {
    setShowBalloon(false);
    try {
      localStorage.setItem(BALLOON_KEY, new Date().toISOString().slice(0, 10));
    } catch {
      // Zonder opslag zie je de ballon gewoon opnieuw.
    }
  };

  const load = useCallback(() => {
    if (msgs !== null) return;
    start(async () => setMsgs(await dotHistoryAction()));
  }, [msgs]);

  const ask = useCallback((intent: Intent, text = "") => {
    setOpen(true);
    dismissBalloon();
    setThinking(true);
    start(async () => {
      const [res] = await Promise.all([dotAskAction(intent, text), new Promise((r) => setTimeout(r, 700))]);
      setThinking(false);
      setMsgs((m) => [...(m ?? []), ...res]);
    });
  }, []);

  useEffect(() => {
    const onAsk = (e: Event) => ask((e as CustomEvent<Intent>).detail ?? "week");
    window.addEventListener("dot:ask", onAsk);
    return () => window.removeEventListener("dot:ask", onAsk);
  }, [ask]);

  useEffect(() => {
    if (!open) return;
    load();
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, load]);

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [msgs, thinking]);

  const resolve = (i: number, done: "yes" | "no") =>
    start(async () => {
      const m = msgs?.[i];
      if (!m?.change) return;
      if (done === "yes") {
        const res = await dotApplyAction({ campaignId: m.change.campaignId, value: m.change.value });
        if (!res.ok) return;
        router.refresh();
        toast.show({
          message: m.change.text,
          undo: res.logId
            ? () =>
                start(async () => {
                  await undoChange(res.logId!);
                  router.refresh();
                })
            : undefined,
        });
      } else await dotDeclineAction();
      setMsgs((all) => (all ?? []).map((x, j) => (j === i && x.change ? { ...x, change: { ...x.change, done } } : x)));
    });

  const shown: DotMessage[] = msgs && msgs.length ? msgs : [{ from: "dot", text: t("hello", { name: firstName }) }];

  return (
    <>
      {showBalloon && !open && balloon ? (
        <div role="status" className="dot-balloon">
          <span>{balloon}</span>
          <div className="dot-balloon__btns">
            <button
              type="button"
              className="as-textbtn"
              onClick={() => {
                dismissBalloon();
                router.push("/vandaag");
              }}
            >
              {t("show")}
            </button>
            <button type="button" className="dot-balloon__later" onClick={dismissBalloon}>
              {t("later")}
            </button>
          </div>
        </div>
      ) : null}
      {!open ? (
        <button
          type="button"
          data-tour="parel"
          className="dot-btn"
          aria-label={t("open")}
          onClick={() => {
            setOpen(true);
            dismissBalloon();
          }}
        >
          <DotCharacter size={56} mood={showBalloon ? "praat" : "rust"} />
        </button>
      ) : null}
      {open ? (
        <div role="dialog" aria-modal="false" aria-label={t("name")} className="dot-panel">
          <header className="dot-panel__head">
            <DotCharacter size={36} mood={thinking ? "denkt" : "rust"} still />
            <span className="dot-panel__title">
              <b>{t("name")}</b>
              <span>{account}</span>
            </span>
            <IconButton icon="x" label={t("close")} onClick={() => setOpen(false)} />
          </header>
          <div className="dot-panel__msgs" ref={list} aria-live="polite">
            {shown.map((m, i) => (
              <Message
                key={i}
                m={m}
                onResolve={(d) => resolve(i, d)}
                onAsk={ask}
                onClose={() => setOpen(false)}
                onPush={(x) => setMsgs((all) => [...(all ?? []), x])}
              />
            ))}
            {thinking ? (
              <div role="status" className="dot-msg dot-msg--dot dot-thinking">
                <Loader />
                <span>{t("thinking")}</span>
              </div>
            ) : null}
          </div>
          <div className="dot-panel__foot">
            <div className="dot-pills">
              {PILLS.map((p) => (
                <button key={p} type="button" className="dot-pill" onClick={() => ask(p)}>
                  {t(`questions.${p}`)}
                </button>
              ))}
            </div>
            <form
              className="dot-form"
              onSubmit={(e) => {
                e.preventDefault();
                const q = input.trim();
                if (!q) return;
                setInput("");
                ask("free", q);
              }}
            >
              <label className="as-sr" htmlFor="dot-in">
                {t("askLabel")}
              </label>
              <input id="dot-in" ref={inputRef} type="text" value={input} placeholder={t("askLabel")} onChange={(e) => setInput(e.target.value)} />
              <button type="button" className="dot-round" aria-label={t("mic")} title={t("micLater")} aria-disabled="true">
                <Icon name="mic" size={18} />
              </button>
              <button type="submit" className="dot-round dot-round--send" aria-label={t("send")}>
                <Icon name="arrow" size={16} />
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}

function Message({
  m,
  onResolve,
  onAsk,
  onClose,
  onPush,
}: {
  m: DotMessage;
  onResolve: (d: "yes" | "no") => void;
  onAsk: (i: Intent, text?: string) => void;
  onClose: () => void;
  onPush: (m: DotMessage) => void;
}) {
  const t = useTranslations("dot");
  const me = m.from === "me";
  return (
    <div className={["dot-msg", me ? "dot-msg--me" : "dot-msg--dot", m.kind && "dot-msg--card"].filter(Boolean).join(" ")}>
      {m.text ? <div className="dot-msg__text">{m.text}</div> : null}
      {m.kind === "bars" && m.bars ? (
        <div className="dot-bars" role="img" aria-label={t("barsLabel")}>
          {m.bars.map((b) => {
            const max = Math.max(...m.bars!.map((x) => Math.max(x.rev, x.spend)), 1);
            return (
              <div key={b.n} className="dot-bar">
                <span>{b.n}</span>
                <span className="dot-bar__track">
                  <span className="dot-bar__rev" style={{ width: `${(b.rev / max) * 100}%` }} />
                  <span className="dot-bar__spend" style={{ width: `${(b.spend / max) * 100}%` }} />
                </span>
              </div>
            );
          })}
          <span className="as-small as-muted">{t("barsNote")}</span>
        </div>
      ) : null}
      {m.kind === "plan" && m.plan ? (
        <div className="dot-plan">
          <b>{t("planTitle")}</b>
          <dl>
            {m.plan.rows.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          <span className="as-small as-muted">{t("planMake")}</span>
          <ol>
            {m.plan.make.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <div className="dot-actions">
            <Link className="as-btn as-btn--primary as-btn--small" href="/campagnes/nieuw?strategie=feest" onClick={onClose}>
              {t("toWizard")}
            </Link>
            <Button variant="secondary" size="small" onClick={() => onAsk("free", t("adjustQ"))}>
              {t("adjust")}
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() =>
                onPush(
                  (m.plan!.credits ?? 0) < 30
                    ? { from: "dot", text: t("photosShort", { n: m.plan!.credits ?? 0 }), buttons: [{ label: t("toStudio"), href: "/studio" }] }
                    : { from: "dot", text: t("photosOk"), buttons: [{ label: t("toStudio"), href: "/studio" }] },
                )
              }
            >
              {t("aiPhotos")}
            </Button>
          </div>
        </div>
      ) : null}
      {m.kind === "change" && m.change ? (
        <div className="dot-change">
          <span className="as-small as-muted">{t("changeTitle")}</span>
          <b>{m.change.text}</b>
          {m.change.warn ? (
            <div className="dot-warn">
              <b>{t("warnTitle")}</b>
              <span>{t("warnBudget")}</span>
            </div>
          ) : null}
          {m.change.done ? (
            <span className="as-small as-muted">{m.change.done === "yes" ? t("doneYes") : t("doneNo")}</span>
          ) : (
            <div className="dot-actions">
              <Button size="small" arrow={false} onClick={() => onResolve("yes")}>
                {t("doIt")}
              </Button>
              <Button variant="secondary" size="small" onClick={() => onResolve("no")}>
                {t("dont")}
              </Button>
            </div>
          )}
        </div>
      ) : null}
      {m.buttons?.length ? (
        <div className="dot-actions">
          {m.buttons.map((b) => (
            <Link key={b.label} className="as-btn as-btn--secondary as-btn--small" href={b.href} onClick={onClose}>
              {b.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
