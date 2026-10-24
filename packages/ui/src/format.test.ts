import {
  formatDashDate,
  formatDateTime,
  formatEuro,
  formatLongDate,
  formatMonthCode,
  formatNumber,
  formatPercent,
  formatRoas,
  formatTime,
} from "./format";

describe("bedragen en getallen (nl-BE)", () => {
  it("euro zonder spatie, zonder centen als het kan", () => {
    expect(formatEuro(1234.56)).toBe("€1.234,56");
    expect(formatEuro(195)).toBe("€195");
    expect(formatEuro(23.2)).toBe("€23,20");
    expect(formatEuro(21, 2)).toBe("€21,00");
    expect(formatEuro(2151)).toBe("€2.151");
  });
  it("percentages en ROAS met komma", () => {
    expect(formatPercent(0.4)).toBe("40%");
    expect(formatPercent(0.014)).toBe("1,4%");
    expect(formatRoas(638 / 280)).toBe("2,28");
    expect(formatRoas(2.5)).toBe("2,5");
    expect(formatRoas(3.07)).toBe("3,07");
    expect(formatRoas(2, 2)).toBe("2,00");
    expect(formatNumber(36800)).toBe("36.800");
  });
});

describe("datums", () => {
  it("demodatum", () => {
    expect(formatLongDate("2026-12-07")).toBe("maandag 7 december");
    expect(formatTime("2026-12-07T06:00:00+01:00")).toBe("06:00");
    expect(formatDateTime("2026-12-05T14:12:00+01:00")).toBe("5 december 14:12");
  });
  it("naamgeving", () => {
    expect(formatDashDate("2026-11-17")).toBe("17-11-2026");
    expect(formatMonthCode("2026-11-17")).toBe("nov26");
  });
});
