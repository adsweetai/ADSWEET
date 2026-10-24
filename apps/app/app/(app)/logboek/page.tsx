import { must, type LogEntry } from "@adsweet/db";
import { routeMetadata } from "@/lib/meta";
import { getDb } from "@/lib/server/auth";
import { getContext } from "@/lib/server/context";
import { LogList } from "@/components/LogList";
import { LogFilters } from "./LogClient";
import "./logboek.css";

export const generateMetadata = routeMetadata("logboek");

const KIND_OF: Record<LogEntry["kind"], string> = {
  budget: "budget",
  advertentie: "advertenties",
  extra: "instellingen",
  wijziging: "instellingen",
  campagne: "instellingen",
  audit: "audit",
};

export default async function LogbookPage({ searchParams }: { searchParams: Promise<{ wie?: string; campagne?: string; soort?: string }> }) {
  const ctx = await getContext();
  const db = await getDb();
  const sp = await searchParams;
  const [rows, campaigns] = await Promise.all([
    db.from("log_entries").select().eq("organization_id", ctx.org.id).order("at", { ascending: false }).then(must),
    db.from("campaigns").select("id, name").eq("organization_id", ctx.org.id).order("created_at").then(must),
  ]);
  const who = sp.wie ?? "alle";
  const filtered = rows.filter((r) => {
    if (who === "jij" && !(r.actor === "user" && r.user_id === ctx.user.id)) return false;
    if (who === "team" && !(r.actor === "user" && r.user_id !== ctx.user.id)) return false;
    if (who === "autopilot" && r.actor !== "autopilot") return false;
    if (who === "buiten" && r.actor !== "outside") return false;
    if (sp.campagne && r.campaign_id !== sp.campagne) return false;
    if (sp.soort && sp.soort !== "alles" && KIND_OF[r.kind] !== sp.soort) return false;
    return true;
  });
  return (
    <div className="lb">
      <LogFilters
        values={{ wie: who, campagne: sp.campagne ?? "", soort: sp.soort ?? "alles" }}
        campaigns={campaigns.map((c) => ({ value: c.id, label: c.name }))}
      />
      <LogList rows={filtered} canEdit={ctx.canEdit} />
    </div>
  );
}
