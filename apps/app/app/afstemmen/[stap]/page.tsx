import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@adsweet/ui";
import { getContext } from "@/lib/server/context";

// Het onboardingpaneel ("Stem AdSweet af op je zaak", 8 stappen) volgt in fase 6.
export default async function TuningPage() {
  await getContext();
  const t = await getTranslations("shell");
  const tn = await getTranslations("nav");
  return (
    <main style={{ padding: "48px clamp(20px, 4vw, 64px)", maxWidth: 640 }}>
      <EmptyState
        text={t("emptyPage")}
        action={
          <Link className="as-link" href="/vandaag">
            {tn("vandaag")}
          </Link>
        }
      />
    </main>
  );
}
