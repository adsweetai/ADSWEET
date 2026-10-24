import { createDemoDatabase, type DemoDb } from "./demo";
import { pgliteExecutor, toSql } from "./executors/pglite";
import { ORG_IDS, userId } from "./fixtures";
import { createDb, must } from "./query";

let pg: DemoDb;
beforeAll(async () => {
  pg = await createDemoDatabase();
});
afterAll(() => pg.close());

const as = (who: Parameters<typeof userId>[0] | null) => createDb(pgliteExecutor(pg, who ? userId(who) : null));

describe("querybouwer op PGlite", () => {
  it("selecteert met filters, volgorde en limiet", async () => {
    const ads = must(await as("lisa").from("ads").select("code, name").eq("organization_id", ORG_IDS.lisa).order("code").limit(2));
    expect(ads).toEqual([
      { code: "A1", name: "Kaars wordt aangestoken" },
      { code: "A2", name: "Zo gieten we ze" },
    ]);
  });

  it("geeft één rij terug met single en null met maybeSingle", async () => {
    const org = must(await as("tom").from("organizations").select().single());
    expect(org.name).toBe("Peeters Dakwerken");
    const none = must(await as("tom").from("organizations").select().eq("id", ORG_IDS.lisa).maybeSingle());
    expect(none).toBeNull();
  });

  it("past RLS toe bij het wijzigen", async () => {
    const lisa = await as("lisa").from("campaigns").update({ daily_budget: 48 }).eq("name", "Noor · Vast · Verkopen · nov26").select();
    expect(must(lisa)).toHaveLength(1);
    const tom = await as("tom").from("campaigns").update({ daily_budget: 1 }).eq("organization_id", ORG_IDS.lisa).select();
    expect(must(tom)).toHaveLength(0);
  });

  it("voegt toe en leest jsonb en arrays terug", async () => {
    const row = must(
      await as("lisa")
        .from("log_entries")
        .insert({
          organization_id: ORG_IDS.lisa,
          actor: "user",
          what: "Test",
          undo: { kind: "budget", from: 48, to: 40 },
        })
        .select()
        .single(),
    );
    expect(row.undo).toEqual({ kind: "budget", from: 48, to: 40 });
    const camp = must(await as("lisa").from("campaigns").select().eq("outside_adsweet", true).single());
    expect(camp.deviations).toEqual(["budget per ad set", "interesses in 2 ad sets"]);
    expect(typeof camp.created_at).toBe("string");
  });

  it("upsert werkt op de primaire sleutel", async () => {
    const db = as("lisa");
    must(await db.from("autopilot_settings").upsert({ organization_id: ORG_IDS.lisa, mode: "grenzen" }, { onConflict: "organization_id" }));
    const s = must(await db.from("autopilot_settings").select().eq("organization_id", ORG_IDS.lisa).single());
    expect(s.mode).toBe("grenzen");
  });

  it("weigert onbekende kolommen", () => {
    expect(() =>
      toSql({
        table: "ads",
        action: "select",
        columns: "id; drop table ads",
        filters: [],
        order: [],
        returning: true,
      }),
    ).toThrow();
  });
});
