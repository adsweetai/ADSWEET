"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@adsweet/ui";
import type { Access, RightsVM } from "@/lib/server/agency";
import { accessAction } from "../klanten/actions";

/** Rechten per klant: per teamlid en per klant geen toegang, kijken of wijzigen. */
export function Rights({ vm, canEdit }: { vm: RightsVM; canEdit: boolean }) {
  const t = useTranslations("agency.rights");
  const toast = useToast();
  const [pending, start] = useTransition();
  if (!vm.members.length) return <p className="as-muted">{t("none")}</p>;
  return (
    <div className="as-tablewrap" aria-busy={pending}>
      <table className="as-table rights-table" style={{ minWidth: 520 + vm.clients.length * 120 }}>
        <thead>
          <tr>
            <th>{t("member")}</th>
            {vm.clients.map((c) => (
              <th key={c.id}>{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vm.members.map((m) => (
            <tr key={m.userId}>
              <td>
                <b style={{ fontWeight: 500 }}>{m.name}</b>
              </td>
              {vm.clients.map((c) => (
                <td key={c.id}>
                  <select
                    className="as-select"
                    aria-label={t("aria", { member: m.name, client: c.name })}
                    value={m.access[c.id]}
                    disabled={!canEdit || pending}
                    onChange={(e) =>
                      start(async () => {
                        const res = await accessAction(m.userId, c.id, e.target.value as Access);
                        if (res.ok) toast.show({ message: t("saved") });
                      })
                    }
                  >
                    {(["geen", "lezer", "beheerder"] as Access[]).map((a) => (
                      <option key={a} value={a}>
                        {t(`levels.${a}`)}
                      </option>
                    ))}
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
