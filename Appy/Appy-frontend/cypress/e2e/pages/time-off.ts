import { expectURL, expectURLs, getElement } from "cypress/support/commands";
import { Dayjs } from "dayjs";
import { dateLookup } from "../lookups/date-lookup";
import { toggleSwitch } from "../lookups/toggle-switch";

type TimeOffTab = "oneoff" | "recurring" | "holidays";
type TimeOffScope = "upcoming" | "history";

// The time-off list/container page.
export let timeOff = {
  checkView() {
    expectURL("/time-off");
  },

  visit() {
    cy.visit("/time-off");
    this.checkView();
    getElement("time-off-tabs").should("exist");
    return this;
  },

  openTab(tab: TimeOffTab) {
    this.checkView();
    getElement(`time-off-tab-${tab}`).click();
    return this;
  },

  openScope(scope: TimeOffScope) {
    this.checkView();
    getElement(`time-off-scope-${scope}`).click();
    return this;
  },

  add() {
    this.checkView();
    getElement("time-off-add").click();
    return timeOffEdit;
  },

  expectNoAddButton() {
    this.checkView();
    cy.get("[data-test=time-off-add]").should("not.exist");
    return this;
  },

  configureImport() {
    this.checkView();
    getElement("time-off-configure-import").click();
    return this;
  },

  expectConfigureImportButton() {
    getElement("time-off-configure-import").should("exist");
    return this;
  },

  expectScopeSwitch() {
    getElement("time-off-scope").should("exist");
    return this;
  },

  list() {
    this.checkView();

    return {
      expectRow(text: string) {
        getElement("time-off-list").find("[data-test=time-off-row]").should("contain", text);
        return this;
      },

      // Assert the row matching `rowText` also shows `detail` (e.g. a time or date).
      expectRowDetail(rowText: string, detail: string) {
        getElement("time-off-list").find("[data-test=time-off-row]").contains(rowText)
          .closest("[data-test=time-off-row]").should("contain", detail);
        return this;
      },

      expectNoRow(text: string) {
        getElement("time-off-list").should("not.contain", text);
        return this;
      },

      openRow(text: string) {
        getElement("time-off-list").find("[data-test=time-off-row]").contains(text).click();
        return timeOffView;
      },
    };
  },
};

// The create/edit form. Also opened in holiday mode (locked label, single date) via the same
// `/time-off/edit/:id` route when reached from the Holidays tab's details view.
export let timeOffEdit = {
  checkView() {
    expectURLs(/\/time-off\/edit\/\d+/, /\/time-off\/new/);
  },

  setLabel(label: string) {
    this.checkView();
    getElement("time-off-label").clear().type(label);
    return this;
  },

  toggleAllDay() {
    toggleSwitch("time-off-all-day");
    return this;
  },

  selectDayOfWeek(day: string) {
    getElement("time-off-day-of-week").find(".my-button").click();
    cy.contains(day).click();
    return this;
  },

  startDate() {
    return dateLookup("time-off-start-date");
  },

  save() {
    this.checkView();
    cy.contains("Save").click();
    return this;
  },

  delete() {
    this.checkView();
    cy.contains("Delete").click();
    return timeOffDeleteDialog;
  },
};

// The "apply changes" prompt shown when saving a recurring edit.
export let timeOffSplitDialog = {
  expectVisible() {
    getElement("time-off-split-dialog").should("exist");
    return this;
  },

  expectNotShown() {
    cy.get("[data-test=time-off-split-dialog]").should("not.exist");
    return this;
  },

  expectFromDateOption() {
    getElement("time-off-split-from-date").should("exist");
    return this;
  },

  expectAllOption() {
    getElement("time-off-split-all").should("exist");
    return this;
  },

  chooseAllOccurrences() {
    getElement("time-off-split-all").click();
    return this;
  },

  apply() {
    getElement("time-off-split-apply").click();
  },
};

// The delete confirmation — a plain confirm, or a stop-vs-remove choice for an active recurring rule.
export let timeOffDeleteDialog = {
  expectVisible() {
    getElement("time-off-delete-dialog").should("exist");
    return this;
  },

  expectPlainConfirm() {
    getElement("time-off-delete-confirm-message").should("exist");
    return this;
  },

  expectStopOption() {
    getElement("time-off-delete-stop").should("exist");
    return this;
  },

  expectRemoveOption() {
    getElement("time-off-delete-remove").should("exist");
    return this;
  },

  chooseRemove() {
    getElement("time-off-delete-remove").click();
    return this;
  },

  // "End it" (stop) is the default mode, so confirm picks it without an explicit selection.
  confirm() {
    getElement("time-off-delete-confirm").click();
  },
};

// The time-off details dialog (app-single-time-off), opened from the list or the appointment views.
export let timeOffView = {
  expectContains(text: string) {
    cy.get("app-single-time-off").should("contain", text);
    return this;
  },

  expectEditButton() {
    getElement("time-off-edit-button").should("exist");
    return this;
  },

  edit() {
    getElement("time-off-edit-button").click();
    return timeOffEdit;
  },
};

// The Holidays tab of the time-off list.
export let holidays = {
  openTab() { timeOff.visit(); getElement("time-off-tab-holidays").click(); return this; },
  configure() { getElement("time-off-configure-import").click(); return holidayConfigure; },
  configureViaEmptyState() { getElement("holidays-configure-cta").click(); return holidayConfigure; },
  expectEmpty() { getElement("holidays-empty").should("exist"); return this; },
  expectNoConfigureCTA() { cy.get("[data-test=holidays-configure-cta]").should("not.exist"); return this; },
  expectRowContains(text: string) { cy.get("[data-test=time-off-row]").should("contain", text); return this; },
  openRow(text: string) { cy.get("[data-test=time-off-row]").contains(text).click(); return holidayDetails; },
  // A removed row opens the details view, where its only action is Restore.
  openRemovedRow(text: string) { cy.get("[data-test=time-off-row]").contains(text).click(); return holidayDetails; },
};

// The country-configure dialog for the Holidays tab's auto-import setting.
export let holidayConfigure = {
  expectVisible() { getElement("holiday-configure-dialog").should("exist"); return this; },
  selectCountry(name: string) { getElement("holiday-country-dropdown").find(".my-button").click(); cy.contains(name).click(); return this; },
  import() { getElement("holiday-configure-save").click(); return this; },
};

// The holiday details view (app-single-time-off in holiday mode), opened from the Holidays tab.
export let holidayDetails = {
  expectVisible() { getElement("holiday-details").should("exist"); return this; },
  expectChanges() { getElement("holiday-changes").should("exist"); return this; },
  expectNoChanges() { cy.get("[data-test=holiday-changes]").should("not.exist"); return this; },
  revert() { getElement("holiday-revert").click(); getElement("holiday-revert-confirm").click(); return this; },
  remove() { getElement("holiday-remove").click(); getElement("holiday-remove-confirm").click(); return this; },
  restore() { getElement("holiday-restore").click(); getElement("holiday-restore-confirm").click(); return this; },
  edit() { getElement("holiday-edit").click(); return timeOffEdit; },
};

// Time-off as it surfaces inside the appointment views (badges/bands). Pair with the imported
// `appointments` page object for view switching and date navigation.
export let timeOffInAppointments = {
  // List view: the all-day time-off badge on a day divider.
  listAllDayBadge() {
    return {
      expectContains(text: string) {
        cy.get("[data-test=list-all-day-timeoff]").should("exist").and("contain", text);
        return this;
      },

      expectNoPickList() {
        cy.get("[data-test=list-all-day-timeoff-list]").should("not.exist");
        return this;
      },

      open(text: string) {
        cy.get("[data-test=list-all-day-timeoff]").contains(text).click();
        return timeOffView;
      },
    };
  },

  // Every appointment on a full-day off carries the same red attention border as an overlap.
  expectAppointmentsHighlightedOn(date: Dayjs) {
    cy.get(`app-single-appointment-list-item[data-date='${date.format("YYYY-MM-DD")}'] .appointment`)
      .should("have.length.greaterThan", 0)
      .each($el => cy.wrap($el).should("have.class", "overlapping"));
    return this;
  },

  // Scroller view: the time-off band. The visible band is pointer-events: none (it paints over
  // appointments); the transparent hit layer underneath catches the click.
  scrollerBand() {
    return {
      expectContains(text: string) {
        cy.get("[data-test=scroller-time-off]").should("exist").and("contain", text);
        return this;
      },

      expectNoPickList() {
        cy.get("[data-test=scroller-all-day-timeoff-list]").should("not.exist");
        return this;
      },

      click() {
        cy.get("[data-test=scroller-time-off-hit]").click();
        return timeOffView;
      },
    };
  },
};
