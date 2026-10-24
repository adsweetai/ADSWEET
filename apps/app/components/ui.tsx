"use client";

// Onderdelen uit @adsweet/ui met de vaste teksten uit messages/nl.json.

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  AdLabel,
  ButtonLink,
  PlanGatePanel,
  ProposalLabel,
  StatusBadge,
  Tag,
  TipCard,
  ToastProvider,
  WarningBlock,
  type AdLabelKind,
  type StatusKind,
} from "@adsweet/ui";

export function AppToastProvider({ children }: { children: ReactNode }) {
  const t = useTranslations("ui");
  return (
    <ToastProvider undoLabel={t("undo")} closeLabel={t("close")}>
      {children}
    </ToastProvider>
  );
}

/** Het waarschuwingsblok bij een afwijking van het playbook. */
export function PlaybookWarning({
  reason,
  whyHref = "/academy",
  onProceed,
}: {
  reason: ReactNode;
  whyHref?: string;
  onProceed?: () => void;
}) {
  const t = useTranslations("ui");
  return (
    <WarningBlock
      title={t("warnTitle")}
      why={{ label: t("why"), href: whyHref }}
      proceed={onProceed ? { label: t("proceed"), onClick: onProceed } : undefined}
    >
      {reason}
    </WarningBlock>
  );
}

export function PlaybookTip({ children, href = "/academy" }: { children: ReactNode; href?: string }) {
  const t = useTranslations("ui");
  return (
    <TipCard label={t("tipLabel")} more={{ label: t("moreAcademy"), href }}>
      {children}
    </TipCard>
  );
}

export function Status({ kind, size }: { kind: StatusKind; size?: "sm" | "md" | "lg" }) {
  const t = useTranslations("ui.status");
  return (
    <StatusBadge kind={kind} size={size}>
      {t(kind)}
    </StatusBadge>
  );
}

export function Label({ kind, size }: { kind: AdLabelKind; size?: "sm" | "md" | "lg" }) {
  const t = useTranslations("ui.labels");
  return (
    <AdLabel kind={kind} size={size}>
      {t(kind)}
    </AdLabel>
  );
}

export function Proposal({ robijn }: { robijn?: boolean }) {
  const t = useTranslations("ui");
  return <ProposalLabel robijn={robijn}>{t("proposal")}</ProposalLabel>;
}

export function ExampleTag() {
  const t = useTranslations("ui");
  return <Tag>{t("example")}</Tag>;
}

/** Paneel "Dit zit in Pro." met "Bekijk de plannen". Geen kleur, geen robijn. */
export function GatePanel({
  plan,
  text,
  href = "/abonnement",
  isStatic,
}: {
  plan: string;
  text: ReactNode;
  href?: string;
  isStatic?: boolean;
}) {
  const t = useTranslations("ui");
  return (
    <PlanGatePanel
      plan={plan}
      title={t("gateTitle", { plan })}
      text={text}
      static={isStatic}
      action={<ButtonLink href={href}>{t("gateCta")}</ButtonLink>}
    />
  );
}
