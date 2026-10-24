import { readFileSync } from "node:fs";
import { asUser, createDemoDatabase, type DemoDb } from "./demo";
import { buildSeed, ORG_IDS, userId } from "./fixtures";
import { SEED_PATH } from "./schema";
import { seedToSql } from "./seed-sql";

let db: DemoDb;

beforeAll(async () => {
  db = await createDemoDatabase();
});
afterAll(async () => {
  await db.close();
});

const one = async <T>(userKey: Parameters<typeof userId>[0] | null, sql: string, params: unknown[] = []) =>
  asUser(db, userKey ? userId(userKey) : null, async (tx) => (await tx.query<T>(sql, params)).rows);

describe("seed.sql", () => {
  it("is in lijn met de fixtures", () => {
    expect(readFileSync(SEED_PATH(), "utf8")).toBe(seedToSql(buildSeed()));
  });

  it("maakt profielen voor alle gebruikers", async () => {
    const rows = await one<{ first_name: string }>(null, "select first_name from profiles order by first_name");
    expect(rows.map((r) => r.first_name)).toEqual(["AdSweet", "Bram", "Eva", "Lisa", "Sarah", "Teamlid", "Tom"]);
  });
});

describe("cijfers uit C3", () => {
  const totals = (org: string, from: string, to: string) =>
    one<{ spend: number; purchases: number; revenue: number; leads: number }>(
      null,
      `select sum(spend)::numeric as spend, coalesce(sum(purchases),0)::int as purchases, coalesce(sum(revenue),0)::numeric as revenue, coalesce(sum(leads),0)::int as leads
         from insights_daily i join campaigns c on c.id = i.campaign_id
        where i.organization_id = $1 and c.kind = 'vast' and i.date between $2 and $3`,
      [org, from, to],
    );

  it("Lisa, laatste 7 dagen: €280, 11 verkopen, €638", async () => {
    const [t] = await totals(ORG_IDS.lisa, "2026-11-30", "2026-12-06");
    expect(t.spend).toBe(280);
    expect(t.purchases).toBe(11);
    expect(t.revenue).toBe(638);
  });

  it("Lisa: 3 nieuwe verkopen op 6 december", async () => {
    const [t] = await totals(ORG_IDS.lisa, "2026-12-06", "2026-12-06");
    expect(t.purchases).toBe(3);
  });

  it("Lisa: A1 heeft CTR 1,4% en frequentie 2,8; de campagne 36.800 vertoningen, 412 linkklikken, bereik 13.100", async () => {
    const [a1] = await one<{ ctr: number; freq: number }>(
      null,
      `select round(sum(link_clicks)::numeric / sum(impressions) * 100, 1)::float as ctr, round(sum(impressions)::numeric / sum(reach), 1)::float as freq
         from insights_daily i join ads a on a.id = i.ad_id where a.organization_id = $1 and a.code = 'A1'`,
      [ORG_IDS.lisa],
    );
    expect(a1).toEqual({ ctr: 1.4, freq: 2.8 });
    const [c] = await one<{ impressions: number; clicks: number; reach: number; ctr: number }>(
      null,
      `select sum(impressions)::int as impressions, sum(link_clicks)::int as clicks, sum(reach)::int as reach,
              round(sum(clicks)::numeric / sum(impressions) * 100, 2)::float as ctr
         from insights_daily i join campaigns c on c.id = i.campaign_id
        where c.organization_id = $1 and c.kind = 'vast'`,
      [ORG_IDS.lisa],
    );
    expect(c).toEqual({ impressions: 36800, clicks: 412, reach: 13100, ctr: 1.9 });
  });

  it("Lisa: Black Friday €180, 9 verkopen, €522", async () => {
    const [bf] = await one<{ spend: number; purchases: number; revenue: number }>(
      null,
      `select sum(spend)::numeric as spend, sum(purchases)::int as purchases, sum(revenue)::numeric as revenue
         from insights_daily i join campaigns c on c.id = i.campaign_id where c.organization_id = $1 and c.kind = 'bf'`,
      [ORG_IDS.lisa],
    );
    expect(bf).toEqual({ spend: 180, purchases: 9, revenue: 522 });
  });

  it("Tom: week 1 €105 en 4 aanvragen, week 2 €105 en 5 aanvragen", async () => {
    const [w1] = await totals(ORG_IDS.tom, "2026-11-23", "2026-11-29");
    const [w2] = await totals(ORG_IDS.tom, "2026-11-30", "2026-12-06");
    expect([w1.spend, w1.leads, w2.spend, w2.leads]).toEqual([105, 4, 105, 5]);
  });

  it("Bram: €840, 29 verkopen, €2.151 over drie accounts", async () => {
    const [t] = await totals(ORG_IDS.bram, "2026-11-30", "2026-12-06");
    expect([t.spend, t.purchases, t.revenue]).toEqual([840, 29, 2151]);
  });

  it("credits: Lisa heeft er nog 18 van 50, Bram 390 van 600", async () => {
    const rows = await one<{ organization_id: string; left: number }>(
      null,
      "select organization_id, sum(delta)::int as left from credits_ledger where organization_id = any($1) group by organization_id",
      [[ORG_IDS.lisa, ORG_IDS.bram]],
    );
    const left = Object.fromEntries(rows.map((r) => [r.organization_id, r.left]));
    expect(left[ORG_IDS.lisa]).toBe(18);
    expect(left[ORG_IDS.bram]).toBe(390);
  });
});

describe("rechten (RLS)", () => {
  it("Lisa ziet alleen haar eigen organisatie", async () => {
    const rows = await one<{ name: string }>("lisa", "select name from organizations");
    expect(rows.map((r) => r.name)).toEqual(["Atelier Noor"]);
  });

  it("Tom ziet de campagnes van Lisa niet", async () => {
    const rows = await one<{ id: string }>("tom", "select id from campaigns where organization_id = $1", [ORG_IDS.lisa]);
    expect(rows).toHaveLength(0);
    const own = await one<{ name: string }>("tom", "select name from campaigns");
    expect(own.map((r) => r.name)).toEqual(["Peeters · Vast · Aanvragen · nov26"]);
  });

  it("Eva ziet haar bureau en de 6 klanten", async () => {
    const rows = await one<{ name: string; agency_parent_id: string | null }>("eva", "select name, agency_parent_id from organizations order by name");
    expect(rows).toHaveLength(7);
    expect(rows.filter((r) => r.agency_parent_id === ORG_IDS.eva)).toHaveLength(6);
    expect(rows.find((r) => r.agency_parent_id === null)?.name).toBe("Bureau Kompas");
  });

  it("Bram ziet zijn drie advertentieaccounts", async () => {
    const rows = await one<{ name: string }>("bram", "select name from ad_accounts order by sort");
    expect(rows.map((r) => r.name)).toEqual(["Veld & Vuur", "Trapkracht", "Proefshop"]);
  });

  it("een eigenaar kan een voorstel afhandelen, een andere klant niet", async () => {
    const decide = (who: "lisa" | "tom") =>
      asUser(db, userId(who), async (tx) => {
        const r = await tx.query("update recommendations set status = 'later' where organization_id = $1 and type = 'video_beter' returning id", [
          ORG_IDS.lisa,
        ]);
        await tx.rollback();
        return r.rows.length;
      });
    expect(await decide("lisa")).toBe(1);
    expect(await decide("tom")).toBe(0);
  });

  it("een lezer kan kijken maar niets wijzigen", async () => {
    const lezer = "00000000-0000-4000-8000-00000000000a";
    await db.query("insert into auth.users (id, email) values ($1, 'lezer@ateliernoor.voorbeeld')", [lezer]);
    await db.query("insert into members (user_id, organization_id, role) values ($1, $2, 'lezer')", [lezer, ORG_IDS.lisa]);
    const seen = await asUser(db, lezer, async (tx) => (await tx.query("select id from campaigns")).rows.length);
    expect(seen).toBe(3);
    const changed = await asUser(db, lezer, async (tx) => (await tx.query("update campaigns set daily_budget = 99 returning id")).rows.length);
    expect(changed).toBe(0);
  });

  it("niet ingelogd ziet niets", async () => {
    const rows = await db
      .transaction(async (tx) => {
        await tx.exec("set local role anon");
        return (await tx.query("select id from organizations")).rows;
      })
      .catch(() => []);
    expect(rows).toHaveLength(0);
  });

  it("alleen het AdSweet-team ziet een playbook in concept", async () => {
    await db.query("insert into playbook_versions (version, status, rules) values ('1.1', 'concept', '{}'::jsonb)");
    const lisa = await one<{ version: string }>("lisa", "select version from playbook_versions order by version");
    const team = await one<{ version: string }>("beheer", "select version from playbook_versions order by version");
    expect(lisa.map((r) => r.version)).toEqual(["1.0"]);
    expect(team.map((r) => r.version)).toEqual(["1.0", "1.1"]);
  });
});
