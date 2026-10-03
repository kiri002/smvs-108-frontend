import { expect, test } from "@playwright/test";

import { ADMIN, asUser, CR, HEAD, leader, login, member } from "./helpers";

test.describe.configure({ mode: "serial" });

test("login: wrong PIN shows an error; role lands on its home screen", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/Mobile number/).fill(CR);
  await page.getByLabel(/^PIN/).fill("0000");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Mobile number or PIN is wrong.")).toBeVisible();
  await page.getByLabel(/^PIN/).fill("1080");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/control-room/);
  await expect(page.getByTestId("team-tile-108-B")).toBeVisible();
  await expect(page.getByTestId("reserve-indicator")).toBeVisible();
});

test("signed-out users are sent to login and back", async ({ page }) => {
  await page.goto("/requests/new");
  await expect(page).toHaveURL(/\/login\?next=%2Frequests%2Fnew/);
  await page.getByLabel(/Mobile number/).fill(CR);
  await page.getByLabel(/^PIN/).fill("1080");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/requests\/new/);
});

test("S1 end to end: CR logs Gate-3 parking, dispatches 108-B, Leader resolves on phone, CR closes", async ({ page, browser }) => {
  await login(page, CR);
  await page.getByRole("link", { name: "New request" }).first().click();
  await expect(page).toHaveURL(/\/requests\/new/);

  // WHERE: type-ahead finds Gate-3 from "gate 3"
  await page.locator("#location").fill("gate 3");
  await page.getByRole("option", { name: /Gate-3/ }).click();
  await expect(page.getByTestId("location-selected")).toContainText("Gate-3");
  // WHAT: one tap on the issue sets priority and members
  await page.getByRole("radio", { name: "Parking" }).click();
  await expect(page.locator("#priority")).toHaveValue(/\d+/);
  await page.locator("#members").fill("8");
  await page.locator("#description").fill("Crowd growing");
  // WHO
  await page.locator("#callerName").fill("Parking liaison");
  await page.locator("#callerMobile").fill("9876543210");
  await page.getByLabel("Same as caller").check();
  await page.getByTestId("intake-submit").click();

  await expect(page).toHaveURL(/\/requests\/\d+$/);
  await expect(page.getByRole("heading", { name: "108-0001" })).toBeVisible();
  const panel = page.getByTestId("dispatch-panel");
  await expect(panel.getByTestId("suggestion-108-B")).toContainText("Primary team for Z02");
  await expect(panel.getByRole("checkbox", { name: "108-B" })).toBeChecked();
  await panel.getByTestId("assign-button").click();
  await expect(page.getByTestId("assignment-108-B")).toContainText("Moving");
  await expect(page.getByTestId("request-status")).toContainText("Dispatched");

  // Leader B on a phone
  const lead = await asUser(browser, leader(2), "1080", { width: 390, height: 844 });
  await lead.page.goto("/my-assignment");
  const job = lead.page.getByTestId("job-108-0001");
  await expect(job).toContainText("Parking");
  await expect(job).toContainText("Gate-3");
  await lead.page.getByTestId("btn-arrived").click();
  await expect(lead.page.getByTestId("btn-resolved")).toBeVisible();
  await lead.page.getByTestId("btn-working").click();
  await lead.page.getByTestId("btn-resolved").click();
  await lead.page.getByLabel(/Action taken/).fill("Opened Gate 4 and redirected the flow");
  await lead.page.getByLabel(/Headcount/).fill("300");
  await lead.page.getByRole("button", { name: "Problem resolved" }).last().click();
  await expect(lead.page.getByText("No active job")).toBeVisible();
  await lead.context.close();

  // CR sees it resolved (live update) and closes it
  await expect(page.getByTestId("request-status")).toContainText("Resolved", { timeout: 20_000 });
  await page.getByRole("button", { name: "Close request" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Close request" }).click();
  await expect(page.getByTestId("request-status")).toContainText("Closed");
  await expect(page.getByText("Opened Gate 4 and redirected the flow").first()).toBeVisible();
});

test("duplicate warning appears for a second call at the same place", async ({ page }) => {
  await login(page, CR);
  await page.goto("/requests/new");
  await page.locator("#location").fill("gate 6");
  await page.getByRole("option", { name: /Gate-6/ }).click();
  await page.getByRole("radio", { name: "Gate / Entry-Exit" }).click();
  await page.locator("#callerName").fill("Gate team");
  await page.getByTestId("intake-submit").click();
  await expect(page).toHaveURL(/\/requests\/\d+$/);

  await page.goto("/requests/new");
  await page.locator("#location").fill("gate 6");
  await page.getByRole("option", { name: /Gate-6/ }).click();
  await expect(page.getByTestId("duplicate-warning")).toContainText("108-0002");
});

test("reserve for a non-urgent request needs the Head's approval", async ({ page, browser }) => {
  await login(page, CR);
  await page.goto("/requests/new");
  await page.locator("#zone").selectOption({ label: "Z07 · Back-end / Logistics" });
  await page.getByRole("radio", { name: "Cleanliness" }).click();
  await page.locator("#callerName").fill("Logistics");
  await page.getByTestId("intake-submit").click();
  await expect(page).toHaveURL(/\/requests\/\d+$/);
  const panel = page.getByTestId("dispatch-panel");
  // Untick the primary, pick the reserve
  await panel.getByRole("checkbox", { name: "108-G" }).uncheck();
  await panel.getByRole("checkbox", { name: "108-R" }).check();
  await expect(panel.getByTestId("suggestion-108-R")).toContainText("Needs Head approval");
  await panel.getByTestId("assign-button").click();
  await expect(page.getByText("Reserve approval pending").or(page.getByText("108-R: Needs Head approval")).first()).toBeVisible();

  const head = await asUser(browser, HEAD);
  await head.page.goto("/approvals");
  await head.page.getByRole("button", { name: "Approve" }).first().click();
  await head.page.getByRole("dialog").getByRole("button", { name: "Approve" }).click();
  await expect(head.page.getByText("No reserve requests waiting.")).toBeVisible();
  await head.context.close();

  await page.reload();
  await expect(page.getByTestId("assignment-108-R")).toBeVisible();
});

test("a Member only sees their team's work and cannot raise requests", async ({ page }) => {
  await login(page, member(2));
  await expect(page).toHaveURL(/\/my-assignment/);
  await expect(page.getByRole("link", { name: "New request" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Admin" })).toHaveCount(0);
  await expect(page.getByTestId("btn-duty")).toBeVisible();
  await page.getByTestId("btn-duty").click();
  await expect(page.getByText(/On duty since/)).toBeVisible();
});

test("Gujarati language switch translates the interface", async ({ page }) => {
  await login(page, CR);
  await page.getByRole("button", { name: "Language" }).click();
  await expect(page.getByRole("link", { name: "કંટ્રોલ રૂમ" })).toBeVisible();
  await page.getByRole("button", { name: "ભાષા" }).click();
  await expect(page.getByRole("link", { name: "Control Room" }).first()).toBeVisible();
});

test("admin: setup check, configuration list, add a location, permission matrix", async ({ page }) => {
  await login(page, ADMIN.mobile, ADMIN.pin);
  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByTestId("setup-check")).toContainText(/warning|error|Ready/);

  await page.goto("/admin/config/locations");
  await expect(page.getByRole("cell", { name: "Gate-3", exact: true })).toBeVisible();
  await page.getByTestId("config-add").click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("#f-code").fill("GATE-2");
  await dialog.locator("#f-labelEn").fill("Gate-2");
  await dialog.locator("#f-zoneId").selectOption({ label: "Z02 · Parking / Gates" });
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("cell", { name: "Gate-2", exact: true })).toBeVisible();

  await page.goto("/admin/permissions");
  await expect(page.getByRole("combobox", { name: "Control Room INTAKE CREATE" })).toHaveValue("ALL");

  await page.goto("/admin/users");
  await expect(page.getByRole("cell", { name: "Demo Control Room" })).toBeVisible();
});

test("wall display shows open requests and teams", async ({ page }) => {
  await login(page, CR);
  await page.goto("/display");
  await expect(page.getByTestId("team-tile-108-A")).toBeVisible();
  await expect(page.getByTestId("request-card-108-0002")).toBeVisible();
});

test("cancel needs a reason from the list and releases nothing left open", async ({ page }) => {
  await login(page, CR);
  await page.goto("/requests/2");
  await page.getByRole("button", { name: "Cancel request" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Cancel request" }).click();
  await expect(dialog.getByText(/required/)).toBeVisible();
  await dialog.getByLabel(/Reason/).selectOption({ label: "False alarm" });
  await dialog.getByRole("button", { name: "Cancel request" }).click();
  await expect(page.getByTestId("request-status")).toContainText("Cancelled");
  await expect(page.getByText("False alarm").first()).toBeVisible();
});
