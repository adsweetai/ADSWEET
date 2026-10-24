import { expect, test } from "@playwright/test";
import { login, resetDemo } from "./helpers";

// De rooktest van elke fase: inloggen → Vandaag → een actiekaart afhandelen.
test("rooktest: inloggen, Vandaag en een actiekaart afhandelen", async ({ page }) => {
  await login(page, "lisa");
  await resetDemo(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Goeiemorgen, Lisa" })).toBeVisible();
  await page.locator("#kaart-verliezer").getByRole("button", { name: "Zet hem af" }).click();
  await expect(page.getByRole("status").filter({ hasText: "staat af" })).toBeVisible();
  await page.getByRole("button", { name: "Ongedaan maken" }).click();
  await expect(page.locator("#kaart-verliezer")).toBeVisible();
});
