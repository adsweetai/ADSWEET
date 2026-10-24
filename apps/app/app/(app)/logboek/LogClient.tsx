"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useToast } from "@adsweet/ui";
import { undoChange } from "../vandaag/actions";

export function LogFilters({ values, campaigns }: { values: { wie: string; campagne: string; soort: string }; campaigns: { value: string; label: string }[] }) {
  const t = useTranslations("logbook");
  const router = useRouter();
  const pathname = usePathname();
  const set = (key: string, v: string) => {
    const q = new URLSearchParams({ ...values, [key]: v });
    for (const [k, val] of [...q.entries()]) if (!val || val === "alles" || val === "alle") q.delete(k);
    router.replace(q.size ? `${pathname}?${q}` : pathname);
  };
  const sel = (label: string, key: keyof typeof values, opts: { value: string; label: string }[]) => (
    <label className="lb-filter">
      <span>{label}</span>
      <select className="as-select" value={values[key]} onChange={(e) => set(key, e.target.value)}>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <div className="lb-filters">
      {sel(
        t("filters.who"),
        "wie",
        (["alle", "jij", "team", "autopilot", "buiten"] as const).map((v) => ({ value: v, label: t(`whoOptions.${v}`) })),
      )}
      {sel(t("filters.campaign"), "campagne", [{ value: "", label: t("allCampaigns") }, ...campaigns])}
      {sel(
        t("filters.kind"),
        "soort",
        (["alles", "budget", "advertenties", "instellingen", "audit"] as const).map((v) => ({ value: v, label: t(`kindOptions.${v}`) })),
      )}
    </div>
  );
}

export function UndoButton({ id }: { id: string }) {
  const t = useTranslations("logbook");
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="as-textbtn lb-undo"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await undoChange(id);
          router.refresh();
          if (res.ok) toast.show({ message: t("undoneToast", { what: res.what ?? "" }) });
        })
      }
    >
      {t("undo")}
    </button>
  );
}
