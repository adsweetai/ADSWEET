import { resolveTheme } from "./theme";

describe("thema", () => {
  it("volgt het toestel bij auto", () => {
    expect(resolveTheme("auto", true)).toBe("dark");
    expect(resolveTheme("auto", false)).toBe("light");
  });
  it("een vaste keuze wint van het toestel", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
