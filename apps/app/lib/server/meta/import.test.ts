import { describe, expect, it } from "vitest";
import { must } from "@adsweet/db";
import { ORG_IDS } from "@adsweet/db/fixtures";
import { serviceDb } from "../auth";
import type { MetaAccountOption } from "./assets";
import { addClientsFromMeta } from "./import";

// Klanten uit Meta toevoegen, op de demodatabase: het bureau van Eva (Bureau Kompas) met 6 klanten en 10 plaatsen.

const AGENCY = ORG_IDS.eva;
const account = (id: string, name: string): MetaAccountOption => ({ id, name, status: "actief", currency: "EUR", business: null });

describe("Klanten uit Meta", () => {
  it("maakt per nieuw advertentieaccount een klant in het Agency-plan, met het account gekoppeld", async () => {
    const db = serviceDb();
    const eva = must(await db.from("profiles").select("user_id").eq("email", "eva@bureaukompas.voorbeeld").single()).user_id;
    // Een bestaande klant van Eva heeft al een advertentieaccount uit Meta.
    const clients = must(await db.from("organizations").select("id").eq("agency_parent_id", AGENCY));
    const first = must(await db.from("ad_accounts").select("id").eq("organization_id", clients[0].id).limit(1).single());
    const taken = "act_9000";
    await db.from("ad_accounts").update({ meta_ad_account_id: taken }).eq("id", first.id);

    const accounts = [account(taken, "Al een klant"), account("act_9001", "Juweelzaak Nova"), account("act_9002", "Fietsen Ruben")];
    const res = await addClientsFromMeta(AGENCY, eva, accounts, ["act_9001", "act_9002", taken, "act_niet_zichtbaar"], eva, "webshop");
    expect(res).toMatchObject({ ok: true, created: [{ name: "Juweelzaak Nova" }, { name: "Fietsen Ruben" }] });

    const nova = must(await db.from("organizations").select().eq("name", "Juweelzaak Nova").single());
    expect(nova).toMatchObject({ plan: "agency", subscription_status: "actief", agency_parent_id: AGENCY, onboarding_done: true, kind: "webshop" });
    // Een webshop krijgt meteen het doel verkopen, zodat Vandaag verkopen, omzet en ROAS toont.
    expect(must(await db.from("goals").select("type").eq("organization_id", nova.id).single())).toEqual({ type: "verkopen" });
    const acc = must(await db.from("ad_accounts").select().eq("organization_id", nova.id).single());
    expect(acc).toMatchObject({ meta_ad_account_id: "act_9001", currency: "EUR", status: "actief", channel: "meta" });
    const conn = must(await db.from("connections").select().eq("organization_id", nova.id).single());
    expect(conn).toMatchObject({ provider: "meta", status: "gekoppeld", meta_ad_account_id: "act_9001", ad_account_id: acc.id, meta_token_user: eva });

    // Twee keer hetzelfde: niets nieuws.
    expect(await addClientsFromMeta(AGENCY, eva, accounts, ["act_9001"], eva)).toEqual({ ok: false, error: "none" });
  });

  it("niet meer klanten dan er plaatsen zijn", async () => {
    const db = serviceDb();
    const eva = must(await db.from("profiles").select("user_id").eq("email", "eva@bureaukompas.voorbeeld").single()).user_id;
    const used = must(await db.from("organizations").select("id").eq("agency_parent_id", AGENCY)).length;
    const many = Array.from({ length: 11 - used }, (_, i) => account(`act_95${i}`, `Klant ${i}`));
    expect(
      await addClientsFromMeta(
        AGENCY,
        eva,
        many,
        many.map((a) => a.id),
        null,
      ),
    ).toEqual({ ok: false, error: "slots" });
  });
});
