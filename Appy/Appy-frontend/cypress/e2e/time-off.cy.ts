import { expectURL, getElement, login } from "cypress/support/commands";
import dayjs from "dayjs";
import { dateLookup } from "./lookups/date-lookup";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Select a day from the day-of-week dropdown (found via its label). */
function selectDayOfWeek(day: string) {
  cy.get("[data-test=time-off-day-of-week]").find(".my-button").click();
  cy.contains(day).click();
}

/** Toggle the app-toggle-switch identified by data-test. */
function toggleSwitch(dataTest: string) {
  cy.get(`[data-test=${dataTest}] .switch`).click();
}

/** Navigate to /time-off (already authenticated) and wait for the tabs to render. */
function visitTimeOff() {
  cy.visit("/time-off");
  expectURL("/time-off");
  cy.get("[data-test=time-off-tabs]").should("exist");
}

function clickTab(tab: "oneoff" | "recurring" | "holidays") {
  cy.get(`[data-test=time-off-tab-${tab}]`).click();
}

function clickScope(scope: "upcoming" | "past") {
  cy.get(`[data-test=time-off-scope-${scope}]`).click();
}

/** Assert the visible list contains a row with `text`. */
function expectRow(text: string) {
  cy.get("[data-test=time-off-list]").find("[data-test=time-off-row]").should("contain", text);
}

/** Click the list row containing `text`. */
function clickRow(text: string) {
  cy.get("[data-test=time-off-list]").find("[data-test=time-off-row]").contains(text).click();
}

/** Click Delete in the editor action bar. */
function clickDeleteButton() {
  cy.contains("Delete").click();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Time Off", () => {
  beforeEach(() => {
    login("appointments");
  });

  it("creates a one-off partial time off and shows it in the One-offs tab", () => {
    visitTimeOff();
    // One-offs tab is the default.
    getElement("time-off-add").click();
    expectURL("/time-off/new");

    getElement("time-off-label").clear().type("One Off Partial");
    // type=oneoff: date range prefilled, times default 09:00–17:00.
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("oneoff");
    clickScope("upcoming");
    expectRow("One Off Partial");
    cy.get("[data-test=time-off-list]").find("[data-test=time-off-row]").contains("One Off Partial")
      .closest("[data-test=time-off-row]").should("contain", "09:00");
  });

  it("creates a weekly all-day time off and shows it in the Recurring tab", () => {
    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    expectURL("/time-off/new");

    getElement("time-off-label").clear().type("Weekly All Day Off");
    // type=recurring defaults to Weekly; pick Monday explicitly, then all-day.
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("recurring");
    expectRow("Weekly All Day Off");
    cy.get("[data-test=time-off-list]").find("[data-test=time-off-row]").contains("Weekly All Day Off")
      .closest("[data-test=time-off-row]").should("contain", "All day");
  });

  it("edits a weekly time off via the details modal and saves the new label", () => {
    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Edit Me Weekly");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("recurring");
    clickRow("Edit Me Weekly");
    // Details modal → Edit button → editor.
    getElement("time-off-edit-button").click();
    expectURL(/\/time-off\/edit\/\d+/);

    getElement("time-off-label").clear().type("Edited Weekly Label");
    cy.contains("Save").click();

    // Recurring edits now prompt for the apply-from scope; apply to the entire schedule.
    getElement("time-off-split-dialog").should("exist");
    getElement("time-off-split-all").click();
    getElement("time-off-split-apply").click();
    expectURL("/time-off");

    clickTab("recurring");
    cy.get("[data-test=time-off-list]").should("not.contain", "Edit Me Weekly");
    expectRow("Edited Weekly Label");
  });

  it("deletes a one-off time off from the editor and removes it from the list", () => {
    visitTimeOff();
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Delete Me One Off");
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("oneoff");
    clickRow("Delete Me One Off");
    getElement("time-off-edit-button").click();
    expectURL(/\/time-off\/edit\/\d+/);

    clickDeleteButton();
    expectURL("/time-off");

    clickTab("oneoff");
    cy.get("[data-test=time-off-list]").should("not.contain", "Delete Me One Off");
  });

  it("edits a one-off time off without showing the apply-from dialog", () => {
    visitTimeOff();
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("One Off No Prompt");
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("oneoff");
    clickRow("One Off No Prompt");
    getElement("time-off-edit-button").click();
    expectURL(/\/time-off\/edit\/\d+/);

    getElement("time-off-label").clear().type("One Off Saved Directly");
    cy.contains("Save").click();

    // One-offs save straight away — no fork dialog, navigation happens immediately.
    expectURL("/time-off");
    cy.get("[data-test=time-off-split-dialog]").should("not.exist");

    clickTab("oneoff");
    expectRow("One Off Saved Directly");
  });

  it("prompts for the apply-from scope when editing a recurring time off", () => {
    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Prompt Alpha");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("recurring");
    clickRow("Prompt Alpha");
    getElement("time-off-edit-button").click();
    expectURL(/\/time-off\/edit\/\d+/);

    getElement("time-off-label").clear().type("Prompt Beta");
    cy.contains("Save").click();

    // The apply-from dialog appears for recurring edits, with both choices.
    getElement("time-off-split-dialog").should("exist");
    getElement("time-off-split-from-date").should("exist");
    getElement("time-off-split-all").should("exist");

    // Default "specific date" is today; on a rule created today this collapses to an in-place edit.
    getElement("time-off-split-apply").click();
    expectURL("/time-off");

    clickTab("recurring");
    cy.get("[data-test=time-off-list]").should("not.contain", "Prompt Alpha");
    expectRow("Prompt Beta");
  });

  it("shows the Holidays tab as a stub with no add button", () => {
    visitTimeOff();
    clickTab("holidays");
    cy.get("[data-test=time-off-holidays-stub]").should("exist");
    cy.get("[data-test=time-off-add]").should("not.exist");
    cy.get("[data-test=time-off-scope]").should("not.exist");
  });

  it("shows an all-day badge in the appointments list for a day covered by all-day time off", () => {
    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Closed Mondays");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    cy.contains("Save").click();
    expectURL("/time-off");

    const monday = dayjs("2021-02-08");
    cy.visit("/appointments");
    expectURL("/appointments");

    getElement("appointment-view-switch-button").then(btn => {
      if (btn.attr("data-test-data") === "scroller") {
        getElement("appointment-view-switch-button").click();
      }
    });
    getElement("appointments-list");
    dateLookup("appointments-date-selector").select(monday);
    getElement("appointments-list-current-date").should("contain", monday.format("DD.MM.YYYY"));

    cy.get("[data-test=list-all-day-timeoff]").should("exist").and("contain", "Closed Mondays");

    // A day with a single all-day time-off jumps straight to its details dialog — no pick-list.
    cy.get("[data-test=list-all-day-timeoff]").contains("Closed Mondays").click();
    cy.get("[data-test=list-all-day-timeoff-list]").should("not.exist");
    cy.get("app-single-time-off").should("contain", "Closed Mondays");
    getElement("time-off-edit-button").should("exist");
  });
});
