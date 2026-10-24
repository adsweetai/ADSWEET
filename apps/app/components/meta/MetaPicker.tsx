"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Select } from "@adsweet/ui";
import { metaChoicesAction, metaConnectAction, metaPixelsAction } from "@/app/meta-actions";
import type { MetaAccountOption, MetaPageOption, MetaPixelOption } from "@/lib/server/meta/assets";
import "./meta-picker.css";

/** Kies het advertentieaccount, de pagina en de pixel uit wat de Meta-sleutel mag zien, en koppel. */
export function MetaPicker({ onConnected }: { onConnected: () => void }) {
  const t = useTranslations("metaPicker");
  const [state, setState] = useState<"loading" | "ready" | "meta" | "expired">("loading");
  const [accounts, setAccounts] = useState<MetaAccountOption[]>([]);
  const [pages, setPages] = useState<MetaPageOption[]>([]);
  const [pixels, setPixels] = useState<MetaPixelOption[]>([]);
  const [sel, setSel] = useState({ accountId: "", pageId: "", pixelId: "" });
  const [message, setMessage] = useState<{ kind: "ok" | "act"; text: string } | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    metaChoicesAction().then((res) => {
      if (!live) return;
      if (!res.ok) return setState(res.error);
      setAccounts(res.accounts);
      setPages(res.pages);
      setSel((s) => ({ ...s, accountId: res.accounts[0]?.id ?? "", pageId: res.pages[0]?.id ?? "" }));
      setState("ready");
    });
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!sel.accountId) return;
    let live = true;
    metaPixelsAction(sel.accountId).then((list) => {
      if (!live) return;
      setPixels(list);
      setSel((s) => ({ ...s, pixelId: list.find((p) => p.ok)?.id ?? list[0]?.id ?? "" }));
    });
    return () => {
      live = false;
    };
  }, [sel.accountId]);

  if (state === "loading") return <p className="mp-note">{t("loading")}</p>;
  if (state !== "ready")
    return (
      <p role="alert" className="mp-alert">
        {t(state === "expired" ? "expired" : "error")}
      </p>
    );
  if (!accounts.length)
    return (
      <p role="alert" className="mp-alert">
        {t("noAccounts")}
      </p>
    );

  return (
    <div className="mp">
      <p className="mp-note">{t("intro")}</p>
      <div className="mp-grid">
        <Select
          label={t("account")}
          value={sel.accountId}
          onChange={(e) => setSel({ ...sel, accountId: e.target.value })}
          options={accounts.map((a) => ({
            value: a.id,
            label: `${a.name} · ${a.id.replace("act_", "")} · ${a.currency}${a.status !== "actief" ? ` · ${t(`status.${a.status}`)}` : ""}`,
          }))}
        />
        <Select
          label={t("page")}
          value={sel.pageId}
          onChange={(e) => setSel({ ...sel, pageId: e.target.value })}
          options={[...pages.map((p) => ({ value: p.id, label: p.ig ? `${p.name} · @${p.ig.username}` : p.name })), { value: "", label: t("noPage") }]}
        />
        <Select
          label={t("pixel")}
          value={sel.pixelId}
          onChange={(e) => setSel({ ...sel, pixelId: e.target.value })}
          options={[...pixels.map((p) => ({ value: p.id, label: `${p.name} · ${p.ok ? t("pixelOk") : t("pixelNotOk")}` })), { value: "", label: t("noPixel") }]}
        />
      </div>
      {message ? (
        <p role={message.kind === "act" ? "alert" : "status"} className={message.kind === "act" ? "mp-alert" : "mp-note"}>
          {message.text}
        </p>
      ) : null}
      <div>
        <Button
          arrow={false}
          disabled={pending || !sel.accountId}
          onClick={() =>
            start(async () => {
              setMessage({ kind: "ok", text: t("connecting") });
              const res = await metaConnectAction({ accountId: sel.accountId, pageId: sel.pageId || null, pixelId: sel.pixelId || null });
              if (!res.ok) return setMessage({ kind: "act", text: t(res.error === "account" ? "errAccount" : "error") });
              setMessage(
                res.sync
                  ? { kind: "ok", text: t("done", { campaigns: res.sync.campaigns, ads: res.sync.ads, days: res.sync.days }) }
                  : { kind: "act", text: t("doneNoSync", { error: res.syncError ?? "" }) },
              );
              onConnected();
            })
          }
        >
          {pending ? t("connecting") : t("connect")}
        </Button>
      </div>
    </div>
  );
}
