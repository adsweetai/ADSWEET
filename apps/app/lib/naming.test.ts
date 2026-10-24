import { describe, expect, it } from "vitest";
import { DEFAULT_NAMING, fillTemplate, fillUtm, namingOf, parseUtm, utmFor } from "./naming";

// Het voorbeeld uit Instellingen › Naamgeving en UTM's (App.dc.html#instellingen-naamgeving).
const campaign = { zaak: "Noor", soort: "Vast", doel: "Verkopen", maand: "nov26" };
const ad = { code: "A1", fase: "Top", soort: "Video", naam: "Kaars wordt aangestoken" };

describe("naamgeving", () => {
  it("vult de sjablonen zoals in het prototype", () => {
    expect(fillTemplate(DEFAULT_NAMING.campaign, campaign)).toBe("Noor · Vast · Verkopen · nov26");
    expect(fillTemplate(DEFAULT_NAMING.ad_set, { n: 1, datum: "17-11-2026", reden: "start" })).toBe("AS1 · 17-11-2026 · start");
    expect(fillTemplate("AS{nr}", { n: 2 })).toBe("AS2");
    expect(fillTemplate(DEFAULT_NAMING.ad, ad)).toBe("A1 · Top · Video · Kaars wordt aangestoken");
  });

  it("laat onbekende stukken staan", () => {
    expect(fillTemplate("{zaak} · {iets}", campaign)).toBe("Noor · {iets}");
  });

  it("vult de UTM's met de stukken van de campagne en van de advertentie", () => {
    expect(fillUtm(DEFAULT_NAMING.utm, { zaak: "Noor", soort: "vast", doel: "verkopen" }, { code: "A1", fase: "Top", soort: "Video" })).toBe(
      "utm_source=meta, utm_medium=paid_social, utm_campaign=noor-vast-verkopen, utm_content=a1-top-video",
    );
  });

  it("geeft een nieuwe campagne dezelfde UTM als voorheen", () => {
    const n = namingOf({ short: "Noor", utm_source: "meta", utm_medium: "paid_social" }, "Atelier Noor");
    expect(utmFor(n, { zaak: n.short, soort: "bf", doel: "verkopen" })).toEqual({ source: "meta", medium: "paid_social", campaign: "noor-bf-verkopen" });
  });

  it("leest een UTM-regel", () => {
    expect(parseUtm("utm_source=meta, utm_medium=paid_social")).toEqual({ utm_source: "meta", utm_medium: "paid_social" });
  });
});
