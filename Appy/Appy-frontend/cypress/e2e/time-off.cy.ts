import dayjs from "dayjs";
import { login } from "cypress/support/commands";
import { appointments } from "./pages/appointments";
import {
  timeOff,
  timeOffSplitDialog,
  timeOffInAppointments,
} from "./pages/time-off";

describe("Time Off", () => {
  beforeEach(() => {
    login("appointments");
  });

  it("creates a one-off partial time off and shows it in the One-offs tab", () => {
    timeOff.visit();
    // One-offs tab is the default. New time-offs default to all-day; turn it off for a 09:00–17:00 range.
    timeOff.add()
      .setLabel("One Off Partial")
      .toggleAllDay()
      .save();

    timeOff.openTab("oneoff").openScope("upcoming");
    timeOff.list()
      .expectRow("One Off Partial")
      .expectRowDetail("One Off Partial", "09:00");
  });

  it("creates a weekly all-day time off and shows it in the Recurring tab", () => {
    timeOff.visit();
    timeOff.openTab("recurring");
    // type=recurring defaults to Weekly; pick Monday explicitly. New time-offs are all-day by default.
    timeOff.add()
      .setLabel("Weekly All Day Off")
      .selectDayOfWeek("Monday")
      .save();

    timeOff.openTab("recurring");
    timeOff.list()
      .expectRow("Weekly All Day Off")
      .expectRowDetail("Weekly All Day Off", "All day")
      // A rule created today is open-ended, so its effective span reads "From <today>".
      .expectRowDetail("Weekly All Day Off", dayjs().format("DD.MM.YYYY"));
  });

  it("edits a weekly time off via the details modal and saves the new label", () => {
    timeOff.visit();
    timeOff.openTab("recurring");
    timeOff.add().setLabel("Edit Me Weekly").selectDayOfWeek("Monday").toggleAllDay().save();

    timeOff.openTab("recurring");
    const view = timeOff.list().openRow("Edit Me Weekly");
    // The details modal shows the recurring effective span (open-ended rule created today → "From <today>").
    view.expectContains(dayjs().format("DD.MM.YYYY"));

    view.edit().setLabel("Edited Weekly Label").save();

    // Recurring edits prompt for the apply-from scope; apply to the entire schedule.
    timeOffSplitDialog.expectVisible().chooseAllOccurrences().apply();

    timeOff.openTab("recurring");
    timeOff.list().expectNoRow("Edit Me Weekly").expectRow("Edited Weekly Label");
  });

  it("deletes a one-off time off from the editor and removes it from the list", () => {
    timeOff.visit();
    timeOff.add().setLabel("Delete Me One Off").save();

    timeOff.openTab("oneoff");
    const edit = timeOff.list().openRow("Delete Me One Off").edit();

    // A one-off can't be stopped, so the delete dialog is a plain confirmation.
    edit.delete().expectVisible().expectPlainConfirm().confirm();

    timeOff.openTab("oneoff");
    timeOff.list().expectNoRow("Delete Me One Off");
  });

  it("edits a one-off time off without showing the apply-from dialog", () => {
    timeOff.visit();
    timeOff.add().setLabel("One Off No Prompt").save();

    timeOff.openTab("oneoff");
    timeOff.list().openRow("One Off No Prompt").edit()
      .setLabel("One Off Saved Directly")
      .save();

    // One-offs save straight away — no fork dialog, navigation happens immediately.
    timeOff.checkView();
    timeOffSplitDialog.expectNotShown();

    timeOff.openTab("oneoff");
    timeOff.list().expectRow("One Off Saved Directly");
  });

  it("prompts for the apply-from scope when editing a recurring time off", () => {
    timeOff.visit();
    timeOff.openTab("recurring");
    timeOff.add().setLabel("Prompt Alpha").selectDayOfWeek("Monday").toggleAllDay().save();

    timeOff.openTab("recurring");
    timeOff.list().openRow("Prompt Alpha").edit().setLabel("Prompt Beta").save();

    // The apply-from dialog appears for recurring edits, with both choices. The default "specific
    // date" is today, which on a rule created today collapses to a plain in-place edit.
    timeOffSplitDialog.expectVisible().expectFromDateOption().expectAllOption().apply();

    timeOff.openTab("recurring");
    timeOff.list().expectNoRow("Prompt Alpha").expectRow("Prompt Beta");
  });

  it("saves a recurring edit in place without the apply-from dialog when the start date changes", () => {
    const newStart = dayjs().add(14, "day");

    timeOff.visit();
    timeOff.openTab("recurring");
    timeOff.add().setLabel("Move Start Recurring").selectDayOfWeek("Monday").toggleAllDay().save();

    timeOff.openTab("recurring");
    const edit = timeOff.list().openRow("Move Start Recurring").edit();

    // Moving the start date is direct timeline editing, so it saves in place — no fork dialog.
    edit.startDate().select(newStart);
    edit.save();

    timeOff.checkView();
    timeOffSplitDialog.expectNotShown();

    timeOff.openTab("recurring");
    timeOff.list().expectRow("Move Start Recurring");
  });

  it("shows the Holidays tab with the scope switch and a configure-import button instead of add", () => {
    timeOff.visit();
    timeOff.openTab("holidays");

    timeOff
      .expectNoAddButton()
      .expectScopeSwitch()
      .expectConfigureImportButton();
  });

  it("shows an all-day badge in the appointments list for a day covered by all-day time off", () => {
    const monday = dayjs("2021-02-08");

    timeOff.visit();
    timeOff.openTab("recurring");
    // New time-offs are all-day by default. Recurring rules default their effective-from to today;
    // the only seeded appointments (and thus list days a badge can attach to) are in Feb 2021, so
    // pull the start back to that Monday.
    const edit = timeOff.add().setLabel("Closed Mondays").selectDayOfWeek("Monday");
    edit.startDate().select(monday);
    edit.save();

    cy.visit("/appointments");
    appointments.openListView();
    appointments.jumpToDay(monday);

    timeOffInAppointments.listAllDayBadge().expectContains("Closed Mondays");
    // Appointments booked on that full-day off get the same red attention border as overlapping ones.
    timeOffInAppointments.expectAppointmentsHighlightedOn(monday);

    // A day with a single all-day time-off jumps straight to its details dialog — no pick-list.
    const view = timeOffInAppointments.listAllDayBadge().open("Closed Mondays");
    timeOffInAppointments.listAllDayBadge().expectNoPickList();
    view.expectContains("Closed Mondays").expectEditButton();
  });

  it("opens the time-off details when a partial band is clicked in the scroller view", () => {
    timeOff.visit();
    // One-offs tab is the default; a one-off defaults to today (the scroller's default day). Turn off
    // all-day for a partial 09:00–17:00 band that renders directly without any date navigation.
    timeOff.add().setLabel("Scroller One Off").toggleAllDay().save();

    cy.visit("/appointments");
    appointments.openScrollerView();

    const band = timeOffInAppointments.scrollerBand();
    band.expectContains("Scroller One Off");
    band.click().expectContains("Scroller One Off").expectEditButton();
  });

  it("opens the time-off details when an all-day band is clicked in the scroller view", () => {
    timeOff.visit();
    // New time-offs are all-day by default; a one-off defaults to today.
    timeOff.add().setLabel("Scroller All Day").save();

    cy.visit("/appointments");
    appointments.openScrollerView();

    const band = timeOffInAppointments.scrollerBand();
    band.expectContains("Scroller All Day");
    // A single all-day off jumps straight to its details — no pick-list.
    const view = band.click();
    band.expectNoPickList();
    view.expectContains("Scroller All Day").expectEditButton();
  });

  it("offers stop-vs-delete when deleting an active recurring rule and 'End it' keeps it in History", () => {
    const lastMonth = dayjs().subtract(1, "month").day(1); // a Monday roughly a month ago

    timeOff.visit();
    timeOff.openTab("recurring");
    const edit = timeOff.add().setLabel("Stoppable Weekly").selectDayOfWeek("Monday").toggleAllDay();
    // Recurring rules default their start to today; pull it back so the rule has already started.
    edit.startDate().select(lastMonth);
    edit.save();

    timeOff.openTab("recurring");
    const del = timeOff.list().openRow("Stoppable Weekly").edit().delete();

    // An already-started recurring rule offers stop vs. delete. "End it" (stop) is the default mode.
    del.expectVisible().expectStopOption().expectRemoveOption().confirm();

    // Gone from Active (Upcoming) but kept in History.
    timeOff.openTab("recurring").openScope("upcoming");
    timeOff.list().expectNoRow("Stoppable Weekly");
    timeOff.openScope("history");
    timeOff.list().expectRow("Stoppable Weekly");
  });

  it("deletes a recurring rule entirely via the 'Delete entirely' option", () => {
    const lastMonth = dayjs().subtract(1, "month").day(1);

    timeOff.visit();
    timeOff.openTab("recurring");
    const edit = timeOff.add().setLabel("Removable Weekly").selectDayOfWeek("Monday").toggleAllDay();
    edit.startDate().select(lastMonth);
    edit.save();

    timeOff.openTab("recurring");
    const del = timeOff.list().openRow("Removable Weekly").edit().delete();

    del.expectVisible().chooseRemove().confirm();

    // Absent from both scopes — fully removed.
    timeOff.openTab("recurring").openScope("upcoming");
    timeOff.list().expectNoRow("Removable Weekly");
    timeOff.openScope("history");
    timeOff.list().expectNoRow("Removable Weekly");
  });
});
