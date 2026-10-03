import { expect, type Browser, type Page } from "@playwright/test";

export const CR = "9000000003";
export const HEAD = "9000000002";
export const ADMIN = { mobile: "9000000001", pin: "108108" };
export const leader = (i: number) => `91000000${String(i).padStart(2, "0")}`;
export const member = (i: number) => `93000000${String(i).padStart(2, "0")}`;

export async function login(page: Page, mobile: string, pin = "1080") {
  await page.goto("/login");
  await page.getByLabel(/Mobile number/).fill(mobile);
  await page.getByLabel(/^PIN/).fill(pin);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}

/** A separate signed-in browser context (a second person on another phone). */
export async function asUser(browser: Browser, mobile: string, pin = "1080", viewport?: { width: number; height: number }) {
  const context = await browser.newContext(viewport ? { viewport, isMobile: true, hasTouch: true } : {});
  const page = await context.newPage();
  await login(page, mobile, pin);
  return { context, page };
}
