"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { OrgKind } from "@adsweet/db";
import { Avatar, Button, Icon, IconButton, Input, Select, useToast, type StatusKind } from "@adsweet/ui";
import { Status } from "@/components/ui";
import type { AgencyVM } from "@/lib/server/agency";
import type { ImportChoice } from "@/lib/server/meta/import";
import { selectOrg } from "../shell-actions";
import { addClientAction, importChoicesAction, importClientsAction, syncClientAction } from "./actions";

type Filter = "alle" | StatusKind;

/** Klantenoverzicht van een bureau (App.dc.html#klanten). */
export function Clients({ vm, canEdit, metaImport = false }: { vm: AgencyVM; canEdit: boolean; metaImport?: boolean }) {
  const t = useTranslations("agency");
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("alle");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [pending, start] = useTransition();
  const open = (id: string) =>
    start(async () => {
      if (await selectOrg(id)) router.push("/vandaag");
    });
  const rows = vm.rows.filter((r) => filter === "alle" || r.status === filter);

  return (
    <div className="kl" aria-busy={pending}>
      <header className="kl-head">
        <span className="vd-dots" aria-hidden="true">
          <span className="as-dotfill--roos" />
          <span className="as-dotfill--citroen" />
          <span className="as-dotfill--munt" />
        </span>
        <h1 className="kl-title">{vm.greeting}</h1>
        <p className="kl-summary">{vm.summary}</p>
      </header>
      <div className="kl-kpis">
        {vm.kpis.map((k) => (
          <div key={k.k} className={`kl-kpi as-bg--${k.color}`} data-theme="light">
            <span>{k.k}</span>
            <b>{k.v}</b>
            <span>{k.s}</span>
          </div>
        ))}
      </div>

      <section className="kl-section">
        <div className="kl-bar">
          <span className="kl-bar__left">
            <h2>{t("allClients")}</h2>
            {canEdit ? (
              <Button arrow={false} icon="plus" size="small" onClick={() => setAdding(true)} disabled={vm.slots.used >= vm.slots.total}>
                {t("add")}
              </Button>
            ) : null}
            {metaImport ? (
              <Button arrow={false} variant="secondary" size="small" onClick={() => setImporting(true)} disabled={vm.slots.used >= vm.slots.total}>
                {t("import.button")}
              </Button>
            ) : null}
            <span className="as-small as-muted">{t("slots", { used: vm.slots.used, total: vm.slots.total })}</span>
          </span>
          <div role="group" aria-label={t("filter")} className="as-pills">
            {(["alle", "act", "warn", "ok"] as Filter[]).map((f) => (
              <button key={f} type="button" className="as-pill" aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {t(`filters.${f}`)}
              </button>
            ))}
          </div>
        </div>
        <div className="as-tablewrap">
          <table className="as-table kl-table">
            <thead>
              <tr>
                {(t.raw("cols") as string[]).map((c, i) => (
                  <th key={i} className={i === 0 || i >= 4 ? "cp-left" : undefined}>
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="cp-left">
                    <span className="kl-client">
                      <Avatar initial={r.initial} color={r.color} size={30} />
                      <span className="ob-stack">
                        <b>{r.name}</b>
                        <span className="as-small as-muted">{r.kind}</span>
                      </span>
                    </span>
                  </td>
                  <td>{r.spend}</td>
                  <td>{r.result}</td>
                  <td>
                    <span className="ob-stack">
                      <span>{r.kpi}</span>
                      <span className="as-small as-muted">{r.goal}</span>
                    </span>
                  </td>
                  <td className="cp-left">
                    {r.badge === t("onboarding") || r.badge === t("learning") ? (
                      <span className="as-tag">{r.badge}</span>
                    ) : (
                      <Status kind={r.status} size="sm" />
                    )}
                  </td>
                  <td className="cp-left">{r.open}</td>
                  <td className="cp-left">{r.owner}</td>
                  <td className="cp-left">
                    <button type="button" className="as-textbtn" onClick={() => open(r.id)} aria-label={t("openAria", { name: r.name })}>
                      {t("open")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <span className="as-small as-muted">{t("note")}</span>
      </section>

      {vm.todo.length ? (
        <section className="kl-section">
          <h2 className="kl-h2">{t("todoTitle")}</h2>
          {vm.todo.map((x, i) => (
            <article key={x.clientId + i} className="kl-todo">
              <span className="ob-stack">
                <span className="kl-todo__client">
                  <span className={i === 0 ? "kl-dot kl-dot--first" : "kl-dot"} aria-hidden="true" />
                  {x.client}
                </span>
                <b>{x.text}</b>
              </span>
              <span className="kl-todo__right">
                <Status kind={x.status} size="sm" />
                <button type="button" className="as-textbtn" onClick={() => open(x.clientId)}>
                  {t("open")}
                </button>
              </span>
            </article>
          ))}
        </section>
      ) : null}

      <section className="kl-section">
        <h2 className="kl-h2">{t("toolsTitle")}</h2>
        <div className="kl-tools">
          {(t.raw("tools") as [string, string, string, string, string][]).map(([title, text, btn, href, color]) => (
            <Link key={title} href={href} className={`kl-tool as-bg-snoep--${color}`} data-theme="light">
              <b>{title}</b>
              <span>{text}</span>
              <span className="kl-tool__btn">
                {btn}
                <Icon name="arrow" size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {adding ? <AddClient vm={vm} onClose={() => setAdding(false)} /> : null}
      {importing ? <ImportClients onClose={() => setImporting(false)} /> : null}
    </div>
  );
}

/** Klanten uit Meta: vink de advertentieaccounts aan die je sleutel ziet; elk wordt een klant met zijn cijfers. */
function ImportClients({ onClose }: { onClose: () => void }) {
  const t = useTranslations("agency.import");
  const tp = useTranslations("metaPicker");
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [accounts, setAccounts] = useState<ImportChoice[]>([]);
  const [free, setFree] = useState(0);
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState<OrgKind>("webshop");
  const tk = useTranslations("agency");
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.focus();
    let live = true;
    importChoicesAction().then((res) => {
      if (!live) return;
      if (!res.ok) return setState("error");
      setAccounts(res.accounts);
      setFree(res.free);
      setState("ready");
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !pending && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, pending]);
  const open = accounts.filter((a) => !a.taken);
  const all = open.length > 0 && open.every((a) => chosen.has(a.id));
  const toggle = (id: string) =>
    setChosen((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const submit = () =>
    start(async () => {
      setError(null);
      const res = await importClientsAction([...chosen], kind);
      if (!res.ok) return setError(t(`errors.${res.error}`));
      // Per klant de cijfers ophalen, een na een.
      let failed = 0;
      for (const [i, c] of res.created.entries()) {
        setProgress(t("syncing", { i: i + 1, n: res.created.length, name: c.name }));
        const r = await syncClientAction(c.id);
        if (!r.ok) failed++;
      }
      setProgress(null);
      onClose();
      router.refresh();
      toast.show({ message: failed ? t("doneSome", { n: res.created.length, failed }) : t("done", { n: res.created.length }) });
    });
  return (
    <div className="kl-scrim" onClick={pending ? undefined : onClose}>
      <div
        ref={box}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        aria-busy={pending}
        className="kl-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kl-modal__head">
          <span className="ob-stack">
            <b>{t("title")}</b>
            {state === "ready" ? <span className="as-small as-muted">{t("free", { n: free })}</span> : null}
          </span>
          <IconButton icon="x" label={t("close")} onClick={onClose} disabled={pending} />
        </div>
        <p className="as-small as-muted">{t("intro")}</p>
        {state === "loading" ? <p className="as-small">{t("loading")}</p> : null}
        {state === "error" ? (
          <p role="alert" className="am-alert">
            {t("errors.meta")}
          </p>
        ) : null}
        {state === "ready" && !open.length ? <p className="as-small as-muted">{t("none")}</p> : null}
        {state === "ready" && open.length ? (
          <>
            <Select
              label={t("kind")}
              value={kind}
              disabled={pending}
              options={(["webshop", "dienstverlener", "lokaal", "zelfstandige"] as OrgKind[]).map((k) => ({ value: k, label: tk(`kinds.${k}`) }))}
              onChange={(e) => setKind(e.target.value as OrgKind)}
            />
            <label className="kl-check">
              <input type="checkbox" checked={all} disabled={pending} onChange={() => setChosen(all ? new Set() : new Set(open.map((a) => a.id)))} />
              <b>{t("all", { n: open.length })}</b>
            </label>
            <ul className="kl-import">
              {accounts.map((a) => (
                <li key={a.id}>
                  <label className="kl-check">
                    <input type="checkbox" disabled={a.taken || pending} checked={a.taken || chosen.has(a.id)} onChange={() => toggle(a.id)} />
                    <span className="kl-check__name">{a.name}</span>
                    <span className="as-small as-muted">
                      {a.id.replace("act_", "")} · {a.currency}
                      {a.taken ? ` · ${t("taken")}` : a.status !== "actief" ? ` · ${tp(`status.${a.status}`)}` : ""}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {progress ? (
          <p role="status" className="as-small">
            {progress}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="am-alert">
            {error}
          </p>
        ) : null}
        {chosen.size > free ? <p className="as-small as-muted">{t("tooMany", { n: free })}</p> : null}
        <div className="cp-actions">
          <Button arrow={false} disabled={pending || !chosen.size || chosen.size > free} onClick={submit}>
            {t("submit", { n: chosen.size })}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={pending}>
            {t("cancel")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AddClient({ vm, onClose }: { vm: AgencyVM; onClose: () => void }) {
  const t = useTranslations("agency");
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState<"invite" | "self">("invite");
  const [form, setForm] = useState({ name: "", website: "", kind: "webshop" as OrgKind, owner: vm.owners[0]?.id ?? "", email: "" });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const box = useRef<HTMLFormElement>(null);
  useEffect(() => {
    box.current?.querySelector("input")?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const F = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <div className="kl-scrim" onClick={onClose}>
      <form
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={t("addTitle")}
        className="kl-modal"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await addClientAction({ ...form, owner: form.owner || null, mode });
            if (!res.ok) return setError(t(`errors.${res.error}`));
            onClose();
            router.refresh();
            toast.show({ message: mode === "invite" ? t("addedInvite", { name: form.name }) : t("addedSelf", { name: form.name }) });
            if (mode === "self" && (await selectOrg(res.id))) router.push("/afstemmen/1");
          });
        }}
      >
        <div className="kl-modal__head">
          <span className="ob-stack">
            <b>{t("addTitle")}</b>
            <span className="as-small as-muted">{t("slots", { used: vm.slots.used, total: vm.slots.total })}</span>
          </span>
          <IconButton icon="x" label={t("close")} onClick={onClose} />
        </div>
        <div className="ob-grid">
          <Input label={t("fields.name")} required placeholder={t("fields.namePh")} value={form.name} onChange={F("name")} />
          <Input label={t("fields.site")} placeholder="zaak.voorbeeld" value={form.website} onChange={F("website")} />
          <Select
            label={t("fields.kind")}
            value={form.kind}
            options={(["webshop", "dienstverlener", "lokaal", "zelfstandige"] as OrgKind[]).map((k) => ({ value: k, label: t(`kinds.${k}`) }))}
            onChange={F("kind")}
          />
          <Select
            label={t("fields.owner")}
            value={form.owner}
            options={[...vm.owners.map((o) => ({ value: o.id, label: o.name })), { value: "", label: "[teamlid]" }]}
            onChange={F("owner")}
          />
        </div>
        <fieldset className="kl-modes">
          <legend>{t("modesTitle")}</legend>
          <div role="radiogroup" aria-label={t("modesTitle")} className="up-radios">
            {(["invite", "self"] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={mode === m} className="up-radio" onClick={() => setMode(m)}>
                <b>{t(`modes.${m}.t`)}</b>
                <span>{t(`modes.${m}.s`)}</span>
              </button>
            ))}
          </div>
        </fieldset>
        {mode === "invite" ? <Input label={t("fields.email")} type="email" placeholder="naam@zaak.voorbeeld" value={form.email} onChange={F("email")} /> : null}
        <span className="as-small as-muted">{t("addNote")}</span>
        {error ? (
          <p role="alert" className="am-alert">
            {error}
          </p>
        ) : null}
        <div className="cp-actions">
          <Button type="submit" arrow={false} disabled={pending || !form.name.trim()}>
            {mode === "invite" ? t("submitInvite") : t("submitSelf")}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}
