import { expect, type Page } from "@playwright/test";

export const EMAIL = {
  lisa: "lisa@ateliernoor.voorbeeld",
  tom: "tom@peetersdakwerken.voorbeeld",
  sarah: "sarah@salonmila.voorbeeld",
  bram: "bram@veldenvuur.voorbeeld",
  eva: "eva@bureaukompas.voorbeeld",
  kompasTeam: "teamlid@bureaukompas.voorbeeld",
} as const;

/** Inloggen met de demolink (demomodus, geen echte mail). */
export async function login(page: Page, who: keyof typeof EMAIL, next = "/vandaag") {
  await page.goto(next === "/vandaag" ? "/inloggen" : `/inloggen?next=${encodeURIComponent(next)}`);
  await page.getByRole("button", { name: "Inloggen met e-mail" }).click();
  await page.getByLabel("E-mail").fill(EMAIL[who]);
  await page.getByRole("button", { name: "Stuur me een link" }).click();
  await expect(page.getByRole("heading", { name: "Check je mailbox." })).toBeVisible();
  await page.getByRole("link", { name: "Demo: open de link" }).click();
  await expect(page).toHaveURL(new RegExp(`${next.replace(/\//g, "\\/")}$`));
}

/** Zet de demodatabase terug naar de voorbeelddata (via het demopaneel). */
export async function resetDemo(page: Page) {
  await page.getByRole("button", { name: "Demo", exact: true }).click();
  await page.getByRole("button", { name: "Begin opnieuw met de voorbeelddata" }).click();
  await page.getByRole("button", { name: "Demo", exact: true }).click();
}
