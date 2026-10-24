"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { AdCard } from "@adsweet/ui";
import type { AdItemVM } from "@/lib/server/campaigns";

/** Een advertentiekaart die het advertentiepaneel opent (?advertentie=…). */
export function AdCardLink({ ad }: { ad: AdItemVM }) {
  const tl = useTranslations("ui.labels");
  const tc = useTranslations("campaign");
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const open = () => {
    const next = new URLSearchParams(sp.toString());
    next.set("advertentie", ad.id);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
  return (
    <div className={ad.off ? "cp-off" : undefined}>
      <AdCard
        name={ad.title}
        kind={ad.kind}
        phase={ad.phase}
        thumb={ad.thumb ?? undefined}
        label={{ kind: ad.label, text: tl(ad.label) }}
        metrics={[{ k: "", v: ad.off ? tc("adOff") : ad.metric }]}
        extra={ad.changed ? <span className="cp-changed">{tc("changedOutside")}</span> : undefined}
        onClick={open}
      />
    </div>
  );
}
