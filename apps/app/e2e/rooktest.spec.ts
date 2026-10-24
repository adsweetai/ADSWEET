import { expect, test } from "@playwright/test";
import { login } from "./helpers";

// De rooktest van elke fase: inloggen → Vandaag → (vanaf fase 4) een actiekaart afhandelen.
test("rooktest: inloggen en Vandaag", async ({ page }) => {
  await login(page, "lisa");
  await expect(page.getByRole("heading", { name: "Goeiemorgen, Lisa" })).toBeVisible();
  await expect(page.locator(".sh-top__title")).toHaveText("Vandaag");
});
