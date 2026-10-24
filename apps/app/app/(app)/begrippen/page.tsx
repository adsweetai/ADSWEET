import { getTranslations } from "next-intl/server";
import { routeMetadata } from "@/lib/meta";
import { getContext } from "@/lib/server/context";
import { glossaryExamples } from "@/lib/server/glossary";
import { Glossary } from "./Glossary";
import "../academy/academy.css";

export const generateMetadata = routeMetadata("begrippen");

// Begrippenlijst (App.dc.html#begrippen): de vakwoorden uit de app, met een voorbeeld uit je eigen cijfers.
export default async function GlossaryPage() {
  const ctx = await getContext();
  const t = await getTranslations("glossary");
  const examples = await glossaryExamples(ctx);
  const terms = (t.raw("terms") as { k: string; title: string; def: string }[]).map((x) => ({ k: x.k, title: x.title, def: x.def, ex: examples[x.k] ?? null }));
  return <Glossary terms={terms} />;
}
