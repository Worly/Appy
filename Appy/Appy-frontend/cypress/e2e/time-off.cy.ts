import { expectURL, getElement, login } from "cypress/support/commands";
import dayjs from "dayjs";
import { dateLookup } from "./lookups/date-lookup";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Click the app-dropdown with the given data-test attribute and pick the item
 *  whose rendered text matches `label`. The dropdown items render via Angular CDK Overlay
 *  but are still in the document DOM — `cy.contains` finds them globally. */
function selectDropdownItem(dataTest: string, label: string) {
  cy.get(`[data-test=${dataTest}]`).click();
  // Use global contains — matches the item text wherever CDK renders the overlay.
  cy.contains(label).click();
}

/** Select a day from the day-of-week dropdown (no data-test on it; find it via its label). */
function selectDayOfWeek(day: string) {
  // The day-of-week label is "Day of week"; its dropdown sibling has no data-test.
  // Find the .w-input-container that contains that label and click the dropdown button inside it.
  cy.contains(".w-label", "Day of week")
    .closest(".w-input-container")
    .find(".my-button")
    .click();
  // Use global contains — works with the CDK overlay rendering.
  cy.contains(day).click();
}

/** Toggle the app-toggle-switch identified by data-test. */
function toggleSwitch(dataTest: string) {
  cy.get(`[data-test=${dataTest}] .switch`).click();
}

/** Navigate to /time-off (already authenticated) and wait for the list to load. */
function visitTimeOff() {
  cy.visit("/time-off");
  expectURL("/time-off");
  // Wait for the loading spinner to disappear (the groups div replaces it).
  cy.get(".groups").should("exist");
}

/** Click the Delete button in the action bar on the edit page.
 *  Uses global contains — the Delete button text is unique on the edit page
 *  (input values are not matched by cy.contains, so the label field won't interfere). */
function clickDeleteButton() {
  cy.contains("Delete").click();
}

// ---------------------------------------------------------------------------
// Convenience wrappers
// ---------------------------------------------------------------------------

const timeOffList = {
  /** Assert the Weekly section contains a row whose text includes `text`. */
  expectRowInWeekly(text: string) {
    cy.get(".groups").within(() => {
      cy.contains("h3", "Weekly")
        .parent(".group")
        .find("[data-test=time-off-row]")
        .should("contain", text);
    });
  },

  /** Assert the One-off section contains a row whose text includes `text`. */
  expectRowInOneOff(text: string) {
    cy.get(".groups").within(() => {
      cy.contains("h3", "One-off")
        .parent(".group")
        .find("[data-test=time-off-row]")
        .should("contain", text);
    });
  },

  /** Click the row in the Weekly section that contains `text`. */
  clickRowInWeekly(text: string) {
    cy.get(".groups").within(() => {
      cy.contains("h3", "Weekly")
        .parent(".group")
        .find("[data-test=time-off-row]")
        .contains(text)
        .click();
    });
  },

  /** Click the row in the One-off section that contains `text`.
   *  Uses data-date-free approach outside .within() to avoid scope leaks. */
  clickRowInOneOff(text: string) {
    // Find the One-off group and get the row without using .within() — avoids scope-leak issues.
    cy.contains("h3", "One-off")
      .parent(".group")
      .find("[data-test=time-off-row]")
      .contains(text)
      .click();
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Time Off", () => {
  beforeEach(() => {
    // The seed creates (and resets) the "appointments" user — that is the only seeded user.
    // Time-off tests don't depend on the seeded appointments data, they just need a clean
    // logged-in user with a selected facility.
    login("appointments");
  });

  // -------------------------------------------------------------------------
  // Scenario 1 — create a weekly all-day time off and assert it appears in
  // the Weekly group on the management page.
  // -------------------------------------------------------------------------
  it("creates a weekly all-day time off and shows it in the Weekly group", () => {
    visitTimeOff();

    cy.contains("Add time off").click();
    expectURL("/time-off/new");

    // Enter label.
    getElement("time-off-label").clear().type("Weekly All Day Off");

    // Switch recurrence from the default (One-off) to Weekly.
    selectDropdownItem("time-off-recurrence", "Weekly");

    // After switching to Weekly, dayOfWeek is undefined — select Monday explicitly.
    selectDayOfWeek("Monday");

    // Enable all-day toggle (off by default).
    toggleSwitch("time-off-all-day");

    cy.contains("Save").click();

    // location.back() navigates to /time-off.
    expectURL("/time-off");

    // The entry should appear under the Weekly section.
    timeOffList.expectRowInWeekly("Weekly All Day Off");

    // The row should show "All day".
    cy.get(".groups").within(() => {
      cy.contains("h3", "Weekly")
        .parent(".group")
        .find("[data-test=time-off-row]")
        .contains("Weekly All Day Off")
        .closest("[data-test=time-off-row]")
        .should("contain", "All day");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 2 — create a one-off partial time off and assert it appears in
  // the One-off group.
  // -------------------------------------------------------------------------
  it("creates a one-off partial time off and shows it in the One-off group", () => {
    visitTimeOff();

    cy.contains("Add time off").click();
    expectURL("/time-off/new");

    getElement("time-off-label").clear().type("One Off Partial");

    // Recurrence defaults to One-off — no change needed.
    // All-day is off by default; times are pre-populated as 09:00 – 17:00.

    cy.contains("Save").click();

    expectURL("/time-off");

    timeOffList.expectRowInOneOff("One Off Partial");

    // The row should show a time range, not "All day".
    cy.get(".groups").within(() => {
      cy.contains("h3", "One-off")
        .parent(".group")
        .find("[data-test=time-off-row]")
        .contains("One Off Partial")
        .closest("[data-test=time-off-row]")
        .should("contain", "09:00");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 3 — edit an existing time off and assert the change persists.
  // -------------------------------------------------------------------------
  it("edits a weekly time off and saves the updated label", () => {
    visitTimeOff();

    // Create
    cy.contains("Add time off").click();
    getElement("time-off-label").clear().type("Edit Me Weekly");
    selectDropdownItem("time-off-recurrence", "Weekly");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    cy.contains("Save").click();
    expectURL("/time-off");
    timeOffList.expectRowInWeekly("Edit Me Weekly");

    // Edit
    timeOffList.clickRowInWeekly("Edit Me Weekly");
    expectURL(/\/time-off\/edit\/\d+/);

    getElement("time-off-label").clear().type("Edited Weekly Label");
    cy.contains("Save").click();
    expectURL("/time-off");

    cy.get(".groups").within(() => {
      cy.contains("h3", "Weekly")
        .parent(".group")
        .find("[data-test=time-off-row]")
        .should("not.contain", "Edit Me Weekly");
    });
    timeOffList.expectRowInWeekly("Edited Weekly Label");
  });

  // -------------------------------------------------------------------------
  // Scenario 4 — delete a time off and assert it disappears from the list.
  // -------------------------------------------------------------------------
  it("deletes a one-off time off and removes it from the list", () => {
    visitTimeOff();

    // Create
    cy.contains("Add time off").click();
    getElement("time-off-label").clear().type("Delete Me One Off");
    // Default recurrence is One-off; leave as-is. Times pre-populated.
    cy.contains("Save").click();
    expectURL("/time-off");
    timeOffList.expectRowInOneOff("Delete Me One Off");

    // Navigate to edit
    timeOffList.clickRowInOneOff("Delete Me One Off");
    expectURL(/\/time-off\/edit\/\d+/);

    // Click Delete — scoped to the action bar to avoid matching the label input text.
    clickDeleteButton();
    expectURL("/time-off");

    cy.get(".groups").within(() => {
      cy.contains("h3", "One-off")
        .parent(".group")
        .should("not.contain", "Delete Me One Off");
    });
  });

  // -------------------------------------------------------------------------
  // Scenario 5 — all-day badge appears in the appointments list for a day
  // covered by an all-day weekly time-off.
  //
  // Creates a Weekly/Monday/All-day time-off, then jumps the appointments list
  // to 2021-02-08 (a Monday in the seeded data range) and asserts the badge.
  // -------------------------------------------------------------------------
  it("shows an all-day badge in the appointments list for a day covered by all-day time off", () => {
    // Create the time-off first
    visitTimeOff();
    cy.contains("Add time off").click();
    getElement("time-off-label").clear().type("Closed Mondays");
    selectDropdownItem("time-off-recurrence", "Weekly");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    cy.contains("Save").click();
    expectURL("/time-off");
    timeOffList.expectRowInWeekly("Closed Mondays");

    // Navigate to the appointments list and switch to list view.
    const monday = dayjs("2021-02-08");

    cy.visit("/appointments");
    expectURL("/appointments");

    // Switch to list view if currently in scroller view.
    // Use .click() (not .trigger) so Angular's event binding fires properly.
    getElement("appointment-view-switch-button").then(btn => {
      if (btn.attr("data-test-data") === "scroller") {
        getElement("appointment-view-switch-button").click();
      }
    });

    // Wait for the list to become visible (appointments-list is only rendered in list view).
    getElement("appointments-list");

    // Jump to 2021-02-08 (a Monday).
    dateLookup("appointments-date-selector").select(monday);

    // Wait for the list current-date to show the target day.
    getElement("appointments-list-current-date").should("contain", monday.format("DD.MM.YYYY"));

    // The all-day time-off badge should appear on this date's row.
    cy.get("[data-test=list-all-day-timeoff]")
      .should("exist")
      .and("contain", "Closed Mondays");
  });
});
