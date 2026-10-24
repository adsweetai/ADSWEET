import { expect, test } from "@playwright/test";

test.describe("fase 0 · lege pagina", () => {
  test("toont de juiste letter en kleuren in licht", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    const body = page.locator("body");
    await expect(body).toHaveCSS("background-color", "rgb(234, 232, 227)");
    await expect(body).toHaveCSS("color", "rgb(21, 21, 20)");
    expect(await body.evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Host Grotesk");
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.check('500 16px "Host Grotesk"'))).toBe(true);
  });

  test("volgt het toestel in nacht en onthoudt een eigen keuze", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(17, 17, 16)");

    await page.getByRole("button", { name: "Licht" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(234, 232, 227)");
  });
});
