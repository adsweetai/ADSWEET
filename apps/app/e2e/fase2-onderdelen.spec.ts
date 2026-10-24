import { expect, test } from "@playwright/test";

test.describe("fase 2 · onderdelen", () => {
  test("toont alles in licht en nacht, en een actiekaart werkt met Ongedaan maken", async ({ page }) => {
    await page.goto("/_onderdelen");
    await expect(page.getByRole("heading", { name: "Licht", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nacht", level: 2 })).toBeVisible();
    const light = page.locator('.ov-col[data-theme="light"]');
    await expect(light).toHaveCSS("background-color", "rgb(234, 232, 227)");
    await expect(page.locator('.ov-col[data-theme="dark"]')).toHaveCSS("background-color", "rgb(17, 17, 16)");

    await light.getByRole("button", { name: "Zet hem af" }).click();
    await expect(page.getByRole("status").filter({ hasText: "staat af" })).toBeVisible();
    await expect(light.getByRole("button", { name: "Verhoog naar €48" })).toBeVisible();
    await page.getByRole("button", { name: "Ongedaan maken" }).click();
    await expect(light.getByRole("button", { name: "Zet hem af" })).toBeVisible();

    await page.getByRole("button", { name: "Nacht", exact: true }).click();
    await expect(page.locator(".ov-col")).toHaveCount(1);
    await expect(page.locator('.ov-col[data-theme="dark"]')).toBeVisible();
  });
});
