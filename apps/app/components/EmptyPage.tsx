import { getTranslations } from "next-intl/server";
import { EmptyState } from "@adsweet/ui";
import { GatePanel } from "@/components/ui";
import { PLAN_NAME, hasPlan } from "@/lib/plans";
import { getContext } from "@/lib/server/context";
import type { Plan } from "@adsweet/db";

/** Een scherm dat nog leeg is. Met `min` toont het eerst het plan-paneel als het plan te laag is. */
export async function EmptyPage({ min, gateText }: { min?: Plan; gateText?: string }) {
  const t = await getTranslations("shell");
  const ctx = await getContext();
  if (min && !hasPlan(ctx.plan, min)) {
    return (
      <div className="sh-empty">
        <GatePanel plan={PLAN_NAME[min]} text={gateText ?? ""} isStatic />
      </div>
    );
  }
  return (
    <div className="sh-empty">
      <EmptyState text={t("emptyPage")} />
    </div>
  );
}
