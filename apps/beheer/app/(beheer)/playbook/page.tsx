import { getTranslations } from "next-intl/server";
import { BASE_RULES, toForm } from "@/lib/playbook";
import { loadPlaybook } from "@/lib/server/data";
import { PlaybookForm } from "./PlaybookForm";

export async function generateMetadata() {
  const t = await getTranslations("nav");
  return { title: t("playbook") };
}

// Playbook (Beheer.dc.html#playbook): alle regels als gegevens, bewerkt in een concept.
export default async function PlaybookPage() {
  const vm = await loadPlaybook();
  const base = vm.concept?.rules ?? vm.published?.rules ?? BASE_RULES;
  return (
    <PlaybookForm
      initial={toForm(base)}
      note={vm.concept?.note ?? ""}
      version={vm.concept?.version ?? vm.next}
      isNew={!vm.concept}
      published={vm.published?.version ?? null}
    />
  );
}
