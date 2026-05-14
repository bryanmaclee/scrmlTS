/**
 * 03-contact-book.spec.ts — Full-stack e2e (server fns + DB persistence).
 *
 * Wave 3 Dispatch 2 (S86, 2026-05-12).
 *
 * Tests the compiled output of examples/03-contact-book.scrml served via
 * `scrml dev` on http://localhost:3100. This is the only critical-path spec
 * that exercises the full-stack path:
 *   - <db src="contacts.db"> declaration
 *   - server function inference (persistContact / loadContacts via ?{SQL})
 *   - reset(@name) etc. client-side rebind
 *   - for/lift over server-returned rows
 *
 * Acceptance criteria (Wave 3 scoping §A3 — 03-contact-book row):
 *   AC1 — page loads, contact list area visible
 *   AC2 — filling name/email/phone + clicking "Add Contact" triggers server fn,
 *         contact appears in list
 *   AC3 — form fields reset after submit (`reset(@name)` etc.)
 *   AC4 — page reload preserves contacts (DB persistence)
 *   AC5 — no console errors except expected server-fetch noise on initial render
 *
 * DB isolation: truncate-tables-per-test via `db-fixture.ts`. Each test starts
 * with an empty `contacts` table. Tests run serially within this file so a
 * single fixture connection cleanly bounds each test.
 *
 * Locator strategy:
 *   - Form inputs: by placeholder ("Name" / "Email" / "Phone").
 *   - Submit button: by accessible name ("Add Contact").
 *   - Rendered contacts: `<li class="contact-row">` rows under `<ul class="contacts">`.
 *     We query the row count + individual span text (`.name`, `.email`, `.phone`).
 */

import { test, expect } from "../fixtures/db-fixture";

const PATH = "/03-contact-book.html";

// Run serially so each test gets a clean DB without parallel writer collisions.
test.describe.configure({ mode: "serial" });

test.describe("03-contact-book — full-stack persistence", () => {
  let consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // SSE-disconnect on tab close is expected.
        if (/EventSource|live-reload/i.test(text)) return;
        // The earlier auth-noise tolerance window (server-fn 404s,
        // "Not found" JSON parse failures) was closed S91 by removing the
        // <program auth="required"> declaration from 03-contact-book.scrml.
        // The example is a CRUD demo, not an auth demo — see the file
        // header for the migration note. The trucking-dispatch example
        // covers the auth=required + /login pattern. See
        // docs/changes/03-contact-book-auth-redirect-SCOPING/SCOPING.md.
        consoleErrors.push(text);
      }
    });
    page.on("pageerror", (err) => {
      consoleErrors.push(err.message);
    });
    await page.goto(PATH);
  });

  test("AC1 — page loads with Contact Book heading and contact list area", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Contact Book" })).toBeVisible();
    // The empty contacts <ul> is in the DOM but has zero size when empty;
    // assert presence (attached) rather than visibility.
    await expect(page.locator("ul.contacts")).toBeAttached();
    // No console errors except known-noise.
    expect(consoleErrors).toEqual([]);
  });

  test("AC2 — submitting Add Contact persists + renders the new row", async ({ page }) => {
    const NAME = "Ada Lovelace";
    const EMAIL = "ada@analytical.engine";
    const PHONE = "555-0101";

    await page.getByPlaceholder("Name").fill(NAME);
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Phone").fill(PHONE);
    await page.getByRole("button", { name: "Add Contact" }).click();

    // After the server round-trip the contacts list should re-render with the
    // new row. Be patient — server fn round-trip + re-render of for/lift is
    // not instant.
    await expect(page.locator("li.contact-row")).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator("li.contact-row .name")).toHaveText(NAME);
    await expect(page.locator("li.contact-row .email")).toHaveText(EMAIL);
    await expect(page.locator("li.contact-row .phone")).toHaveText(PHONE);
  });

  test("AC3 — form inputs reset after submit", async ({ page }) => {
    await page.getByPlaceholder("Name").fill("Grace Hopper");
    await page.getByPlaceholder("Email").fill("grace@navy.mil");
    await page.getByPlaceholder("Phone").fill("555-0202");
    await page.getByRole("button", { name: "Add Contact" }).click();

    // Wait for the persistence round-trip to complete (row visible in list).
    await expect(page.locator("li.contact-row")).toHaveCount(1, { timeout: 10_000 });

    // After submit, source calls `reset(@name)` / `reset(@email)` / `reset(@phone)`
    // which restores the reactives to their declared default of "". The bound
    // inputs should reflect that.
    await expect(page.getByPlaceholder("Name")).toHaveValue("");
    await expect(page.getByPlaceholder("Email")).toHaveValue("");
    await expect(page.getByPlaceholder("Phone")).toHaveValue("");
  });

  test("AC4 — page reload preserves contacts (DB persistence)", async ({ page }) => {
    // Add a uniquely-identifiable row.
    const NAME = "Alan Turing";
    const EMAIL = "alan@bletchley.uk";
    const PHONE = "555-0303";

    await page.getByPlaceholder("Name").fill(NAME);
    await page.getByPlaceholder("Email").fill(EMAIL);
    await page.getByPlaceholder("Phone").fill(PHONE);
    await page.getByRole("button", { name: "Add Contact" }).click();
    await expect(page.locator("li.contact-row")).toHaveCount(1, { timeout: 10_000 });

    // Hard reload — server function `loadContacts()` should pull the row back
    // from the on-disk DB.
    await page.reload();

    await expect(page.locator("li.contact-row")).toHaveCount(1, { timeout: 10_000 });
    await expect(page.locator("li.contact-row .name")).toHaveText(NAME);
    await expect(page.locator("li.contact-row .email")).toHaveText(EMAIL);
  });

  test("AC5 — no console errors during normal flow", async ({ page }) => {
    // Fill + submit one contact, then reload, then re-check.
    await page.getByPlaceholder("Name").fill("Donald Knuth");
    await page.getByPlaceholder("Email").fill("knuth@stanford.edu");
    await page.getByRole("button", { name: "Add Contact" }).click();
    await expect(page.locator("li.contact-row")).toHaveCount(1, { timeout: 10_000 });

    expect(consoleErrors).toEqual([]);
  });
});
