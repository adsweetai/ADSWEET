"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Role } from "@adsweet/db";
import { Avatar, Button, Input, Select, TextButton, useToast } from "@adsweet/ui";
import { GatePanel } from "@/components/ui";
import { PLAN_NAME } from "@/lib/plans";
import type { TeamVM } from "@/lib/server/team";
import { inviteAction, revokeAction } from "./actions";

/** Team en rollen (App.dc.html#team): gebruikers binnen de limiet van je plan, uitnodigen en de rollen. */
export function Team({ vm }: { vm: TeamVM }) {
  const t = useTranslations("team");
  const tr = useTranslations("roles");
  const toast = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("beheerder");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const next = vm.plan === "agency" ? null : (vm.plan as "starter" | "pro" | "scale");
  return (
    <>
      <span className="as-muted" style={{ fontSize: 14 }}>
        {t("limit", { n: vm.users.length, max: vm.max === null ? t("unlimited") : vm.max, plan: PLAN_NAME[vm.plan] })}
      </span>
      <div className="st-rows">
        {vm.users.map((u) => (
          <div key={u.id} className="tm-user">
            <span className="tm-user__who">
              <Avatar initial={u.initial} color={u.color} size={32} />
              <span className="st-row__text">
                <b>{u.name}</b>
                <span className="st-row__s">{u.sub}</span>
              </span>
            </span>
            <span className="tm-user__side">
              {u.role ? tr(u.role) : null}
              {u.invite ? (
                <TextButton
                  aria-label={t("revokeAria", { email: u.name })}
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await revokeAction(u.id);
                      toast.show({ message: t("revoked") });
                      router.refresh();
                    })
                  }
                >
                  {t("revoke")}
                </TextButton>
              ) : null}
            </span>
          </div>
        ))}
      </div>
      {vm.canInvite ? (
        <form
          className="tm-invite"
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const res = await inviteAction(email, role);
              if (!res.ok) return setError(t(`errors.${res.error}`));
              setError("");
              toast.show({ message: t("sent", { email: email.trim().toLowerCase() }) });
              setEmail("");
              router.refresh();
            });
          }}
        >
          <Input label={t("inviteLabel")} type="email" required placeholder={t("invitePh")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Select
            label={t("role")}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            options={(["beheerder", "lezer"] as Role[]).map((r) => ({ value: r, label: tr(r) }))}
          />
          <Button type="submit" arrow={false} disabled={pending || !email.trim()}>
            {t("send")}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="st-alert">
          {error}
        </p>
      ) : null}
      {vm.full && next ? (
        <div className="tm-gate">
          <GatePanel plan={t(`nextPlan.${next}`)} text={t(`fullText.${next}`)} isStatic />
        </div>
      ) : null}
      <dl className="tm-roles">
        {(t.raw("roles") as [string, string][]).map(([n, d]) => (
          <div key={n}>
            <dt>{n}</dt>
            <dd>{d}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
