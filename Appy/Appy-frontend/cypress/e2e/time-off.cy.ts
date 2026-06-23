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

/** From /appointments, switch to the scroller view when currently showing the list. */
function openScrollerView() {
  getElement("appointment-view-switch-button").then(btn => {
    if (btn.attr("data-test-data") === "list") {
      getElement("appointment-view-switch-button").click();
    }
  });
}

function clickScope(scope: "upcoming" | "past") {
  // Segments are tagged by their label, not the URL token: upcoming → -upcoming, past → -history.
  const dataTest = scope === "past" ? "time-off-scope-history" : "time-off-scope-upcoming";
  cy.get(`[data-test=${dataTest}]`).click();
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
      .closest("[data-test=time-off-row]").should("contain", "All day")
      // Recurring rows show the effective span; a rule created today is open-ended → "From <today>".
      .and("contain", dayjs().format("DD.MM.YYYY"));
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
    // The details modal shows the recurring effective span (open-ended rule created today → "From <today>").
    cy.get("app-single-time-off").should("contain", dayjs().format("DD.MM.YYYY"));
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

    // A one-off can't be stopped, so the delete dialog is a plain confirmation.
    clickDeleteButton();
    getElement("time-off-delete-dialog").should("exist");
    getElement("time-off-delete-confirm-message").should("exist");
    getElement("time-off-delete-confirm").click();
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

  it("saves a recurring edit in place without the apply-from dialog when the start date changes", () => {
    const newStart = dayjs().add(14, "day");

    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Move Start Recurring");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("recurring");
    clickRow("Move Start Recurring");
    getElement("time-off-edit-button").click();
    expectURL(/\/time-off\/edit\/\d+/);

    // Move the start date forward by two weeks — this is the change that triggers the
    // in-place save path introduced on this branch. Before the fix, ANY recurring save
    // opened the fork dialog; now a start-date change bypasses it entirely.
    dateLookup("time-off-start-date").select(newStart);
    cy.contains("Save").click();

    // Must navigate straight back — no fork dialog shown.
    expectURL("/time-off");
    cy.get("[data-test=time-off-split-dialog]").should("not.exist");

    // Confirm the edit actually persisted (guards against a silent save error + router bounce).
    clickTab("recurring");
    expectRow("Move Start Recurring");
  });

  it("shows the Holidays tab as a stub with the scope switch and an auto-import button instead of add", () => {
    visitTimeOff();
    clickTab("holidays");
    cy.get("[data-test=time-off-holidays-stub]").should("exist");
    // No add-new on Holidays; the scope switch and the auto-import config button take its place.
    cy.get("[data-test=time-off-add]").should("not.exist");
    cy.get("[data-test=time-off-scope]").should("exist");
    cy.get("[data-test=time-off-configure-import]").should("exist");
  });

  it("shows an all-day badge in the appointments list for a day covered by all-day time off", () => {
    const monday = dayjs("2021-02-08");

    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Closed Mondays");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    // Recurring rules default their effective-from to today; the only seeded appointments (and thus
    // the only list days a badge can attach to) are in Feb 2021, so pull the start back to that Monday.
    dateLookup("time-off-start-date").select(monday);
    cy.contains("Save").click();
    expectURL("/time-off");

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

    // Appointments booked on that full-day off get the same red attention border as overlapping ones.
    cy.get(`app-single-appointment-list-item[data-date='${monday.format("YYYY-MM-DD")}'] .appointment`)
      .should("have.length.greaterThan", 0)
      .each($el => cy.wrap($el).should("have.class", "on-day-off"));

    // A day with a single all-day time-off jumps straight to its details dialog — no pick-list.
    cy.get("[data-test=list-all-day-timeoff]").contains("Closed Mondays").click();
    cy.get("[data-test=list-all-day-timeoff-list]").should("not.exist");
    cy.get("app-single-time-off").should("contain", "Closed Mondays");
    getElement("time-off-edit-button").should("exist");
  });

  it("opens the time-off details when a partial band is clicked in the scroller view", () => {
    visitTimeOff();
    // One-offs tab is the default; a one-off defaults to today (the scroller's default day),
    // partial 09:00–17:00, so its band renders directly on the scroller without any date navigation.
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Scroller One Off");
    cy.contains("Save").click();
    expectURL("/time-off");

    cy.visit("/appointments");
    expectURL("/appointments");
    openScrollerView();

    // The visible band paints over appointments (pointer-events: none); the click is caught by the
    // transparent hit layer underneath.
    cy.get("[data-test=scroller-time-off]").should("exist").and("contain", "Scroller One Off");
    cy.get("[data-test=scroller-time-off-hit]").click();
    cy.get("app-single-time-off").should("contain", "Scroller One Off");
    getElement("time-off-edit-button").should("exist");
  });

  it("opens the time-off details when an all-day band is clicked in the scroller view", () => {
    visitTimeOff();
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Scroller All Day");
    toggleSwitch("time-off-all-day");
    cy.contains("Save").click();
    expectURL("/time-off");

    cy.visit("/appointments");
    expectURL("/appointments");
    openScrollerView();

    // A single all-day off jumps straight to its details — no pick-list. The visible band is
    // pointer-events: none (it paints over appointments); the hit layer underneath catches the click.
    cy.get("[data-test=scroller-time-off]").should("exist").and("contain", "Scroller All Day");
    cy.get("[data-test=scroller-time-off-hit]").click();
    cy.get("[data-test=scroller-all-day-timeoff-list]").should("not.exist");
    cy.get("app-single-time-off").should("contain", "Scroller All Day");
    getElement("time-off-edit-button").should("exist");
  });

  it("offers stop-vs-delete when deleting an active recurring rule and 'End it' keeps it in Past", () => {
    const lastMonth = dayjs().subtract(1, "month").day(1); // a Monday roughly a month ago

    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Stoppable Weekly");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    // Recurring rules default their start to today; pull it back so the rule has already started.
    dateLookup("time-off-start-date").select(lastMonth);
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("recurring");
    clickRow("Stoppable Weekly");
    getElement("time-off-edit-button").click();
    expectURL(/\/time-off\/edit\/\d+/);

    // Delete now prompts for recurring rules that have already started.
    clickDeleteButton();
    getElement("time-off-delete-dialog").should("exist");
    getElement("time-off-delete-stop").should("exist");
    getElement("time-off-delete-remove").should("exist");

    // "End it" (stop) is the default mode; confirm.
    getElement("time-off-delete-confirm").click();
    expectURL("/time-off");

    // It's gone from Active (Upcoming) but present in Past — history kept.
    clickTab("recurring");
    clickScope("upcoming");
    cy.get("[data-test=time-off-list]").should("not.contain", "Stoppable Weekly");
    clickScope("past");
    expectRow("Stoppable Weekly");
  });

  it("deletes a recurring rule entirely via the 'Delete entirely' option", () => {
    const lastMonth = dayjs().subtract(1, "month").day(1);

    visitTimeOff();
    clickTab("recurring");
    getElement("time-off-add").click();
    getElement("time-off-label").clear().type("Removable Weekly");
    selectDayOfWeek("Monday");
    toggleSwitch("time-off-all-day");
    dateLookup("time-off-start-date").select(lastMonth);
    cy.contains("Save").click();
    expectURL("/time-off");

    clickTab("recurring");
    clickRow("Removable Weekly");
    getElement("time-off-edit-button").click();

    clickDeleteButton();
    getElement("time-off-delete-dialog").should("exist");
    getElement("time-off-delete-remove").click();
    getElement("time-off-delete-confirm").click();
    expectURL("/time-off");

    // Absent from both scopes — fully removed.
    clickTab("recurring");
    clickScope("upcoming");
    cy.get("[data-test=time-off-list]").should("not.contain", "Removable Weekly");
    clickScope("past");
    cy.get("[data-test=time-off-list]").should("not.contain", "Removable Weekly");
  });
});
