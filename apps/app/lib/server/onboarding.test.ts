import { describe, expect, it } from "vitest";
import { stepsFor } from "./onboarding";

describe("Stappen van de onboarding", () => {
  it("stap 7 alleen met bestaande campagnes; een klant van een bureau kiest geen plan (stap 10)", () => {
    expect(stepsFor(false)).toEqual([1, 2, 3, 4, 5, 6, 8, 9, 10, 11]);
    expect(stepsFor(true)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(stepsFor(false, true)).toEqual([1, 2, 3, 4, 5, 6, 8, 9, 11]);
    expect(stepsFor(true, true)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 11]);
  });
});
