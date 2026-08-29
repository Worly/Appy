import { expectURL, login } from "cypress/support/commands"
import dayjs, { Dayjs } from 'dayjs';
import { parseDuration } from "src/app/utils/time-utils";
import duration from "dayjs/plugin/duration";
import customParseFormat from "dayjs/plugin/customParseFormat"
import { getTestService, TestService } from "./test-data";
import { toast } from "./toast";
import { appointments, appointmentEdit, appointmentView, AppointmentInList } from "./pages/appointments";

dayjs.extend(duration);
dayjs.extend(customParseFormat);

function editAndSaveAppointment(newData: {
  client: string,
  service: TestService,
  duration: string,
  date: Dayjs,
  time: string
}, oldData?: {
  client: string,
  service: TestService,
  duration: string,
  date: Dayjs,
  time: string
}, expectedDate?: Dayjs, expectedTime?: string) {
  let expectedDateN = (expectedDate ?? oldData?.date) ?? null;
  if (expectedDateN == null) {
    throw new Error("Expected date is not defined");
  }

  let expectedTimeN = (expectedTime ?? oldData?.time) ?? null;
  let expectedDuration = ((oldData?.duration == oldData?.service?.duration) ? newData.service.duration : oldData?.duration) ?? null;

  appointmentEdit.getDurationLookup().expectSelected(oldData?.duration ?? null);

  appointmentEdit.getClientLookup().expectSelected(oldData?.client ?? null).select(newData.client);
  appointmentEdit.getServiceLookup().expectSelected(oldData?.service?.displayName ?? null).select(newData.service.displayName);
  appointmentEdit.getDurationLookup().expectSelected(expectedDuration).select(newData.duration);
  appointmentEdit.getDateTimeLookup().expectSelected(expectedDateN, expectedTimeN).open().select(newData.date, newData.time);
  appointmentEdit.save();

  // After saving, should land on /appointments with the date selector showing the saved
  // appointment's date. expectCurrentDate() retries (re-reading the selector each attempt)
  // until the date updates — Angular processes the new query param asynchronously after navigation.
  appointments.expectCurrentDate(newData.date);
}

function expectAppointment(
  appointment: {
    client: string,
    service: TestService,
    duration: string,
    date: Dayjs,
    time: string
  },
  viewType: "list" | "scroller" = "list",
  scrollType: "scroll" | "jump" = "scroll"
): Cypress.Chainable<AppointmentInList> {
  if (viewType == "list") {
    appointments.openListView();
  }
  else {
    appointments.openScrollerView();
  }

  if (scrollType == "jump") {
    appointments.jumpToDay(appointment.date);
  }
  else {
    if (viewType == "list") {
      appointments.list().scrollToDay(appointment.date);
    }
    else {
      appointments.scroller().scrollToDay(appointment.date);
    }
  }

  let time = dayjs(appointment.time, "HH:mm");
  let timeTo = time.add(parseDuration(appointment.duration + ":00"));

  let matches = (a: AppointmentInList) =>
    a.client == appointment.client &&
    a.service == appointment.service.displayName &&
    a.timeFrom == appointment.time &&
    a.timeTo == timeTo.format("HH:mm");

  // The scroller/list refetch fresh on navigation/view-switch, and Angular applies the new route
  // params and the fetched page asynchronously, so right after an edit the moved appointment can
  // land a beat after navigation settles. Re-read until it shows up instead of asserting on the
  // first — possibly pre-fetch — snapshot, which otherwise flakes in CI where everything is slower.
  let view = viewType == "list" ? appointments.list() : appointments.scroller();
  let attemptFind = (attemptsLeft: number): any => {
    return view.getAppointments().then(found => {
      let index = found.findIndex(matches);

      if (index > -1)
        return found[index];

      if (attemptsLeft <= 0) {
        expect(index).to.be.greaterThan(-1, "Appointment not found in the list");
        return undefined;
      }

      return cy.wait(200).then(() => attemptFind(attemptsLeft - 1));
    });
  };

  return attemptFind(40);
}

describe('Appointments', () => {
  beforeEach(() => {
    login("appointments");
    cy.visit("/appointments");
    appointments.openListView();
  })

  let creationOptions = [
    {
      name: "after all appointments",
      date: dayjs("2021-02-12"),
      time: "08:05",
      duration: "00:30",
    },
    {
      name: "before all appointments",
      date: dayjs("2021-02-06"),
      time: "09:10",
      duration: "00:25",
    },
    {
      name: "mid appointments at start",
      date: dayjs("2021-02-08"),
      time: "08:00",
      duration: "00:30",
    },
    {
      name: "mid appointments at end",
      date: dayjs("2021-02-08"),
      time: "09:35",
      duration: "00:30",
    },
    {
      name: "mid appointments",
      date: dayjs("2021-02-09"),
      time: "08:40",
      duration: "00:20",
    }
  ]

  let editOptions = [
    {
      name: "edit to same day",
      date: null,
      time: "15:00",
      duration: "00:25"
    },
    {
      name: "edit to different day",
      date: dayjs("2025-12-31"),
      time: "10:00",
      duration: "00:25"
    }
  ]

  let checkingOptions: {
    view: "list" | "scroller",
    scrollType: "scroll" | "jump"
  }[] = [
      {
        view: "list",
        scrollType: "scroll"
      },
      {
        view: "list",
        scrollType: "jump"
      },
      {
        view: "scroller",
        scrollType: "jump"
      }
    ]

  for (let creationOption of creationOptions) {
    for (let editOption of editOptions) {
      for (let checkingOption of checkingOptions) {
        it(`Should be able to add and edit an appointment : ${creationOption.name} : ${editOption.name} : ${checkingOption.view} ${checkingOption.scrollType}`, () => {
          let client1 = "Client1";
          let service1 = getTestService("Service1");

          let client2 = "Client2";
          let service2 = getTestService("Service2");

          appointments.openScrollerView();

          appointments.getCurrentDate().then(currentDate => {
            appointments.plusButton();

            editAndSaveAppointment({
              client: client1,
              service: service1,
              date: creationOption.date,
              time: creationOption.time,
              duration: creationOption.duration
            }, undefined, currentDate);

            expectAppointment({
              client: client1,
              service: service1,
              date: creationOption.date,
              time: creationOption.time,
              duration: creationOption.duration
            }, checkingOption.view, checkingOption.scrollType).then(appointmentInList => {
              let view = checkingOption.view == "list" ? appointments.list() : appointments.scroller();
              view.viewAppointment(appointmentInList.id);
              appointmentView.edit();

              editAndSaveAppointment({
                client: client2,
                service: service2,
                date: editOption.date ?? creationOption.date,
                time: editOption.time,
                duration: editOption.duration
              }, {
                client: client1,
                service: service1,
                date: creationOption.date,
                time: creationOption.time,
                duration: creationOption.duration
              })

              expectAppointment({
                client: client2,
                service: service2,
                date: editOption.date ?? creationOption.date,
                time: editOption.time,
                duration: editOption.duration
              }, checkingOption.view, checkingOption.scrollType)
            });
          });
        })
      }
    }
  }
  // --- Editing a Confirmed appointment reverts its status ---
  // A status-affecting edit (date, time, service or client) reverts a Confirmed appointment
  // back to Unconfirmed; the post-save toast then offers a re-confirm ("check") action.
  // A duration-only edit keeps it Confirmed, so that toast has no confirm action.
  let confirmedAppointment = {
    client: "Client1",
    service: getTestService("Service1"),
    date: dayjs("2025-12-15"),
    time: "10:00",
    duration: "00:30"
  };

  // Create a fresh appointment, confirm it via the post-save toast, then open its detail
  // panel from the list with the status asserted as Confirmed — the shared starting point
  // for every status-revert scenario below.
  function createConfirmAndOpen() {
    appointments.openScrollerView();
    appointments.getCurrentDate().then(currentDate => {
      appointments.plusButton();
      editAndSaveAppointment(confirmedAppointment, undefined, currentDate);
      toast.expectVisible().expectAction("check").clickAction("check");
    });

    return expectAppointment(confirmedAppointment).then(item => {
      appointments.list().viewAppointment(item.id);
      appointmentView.expectStatus("Confirmed");
    });
  }

  let statusRevertOptions: { name: string, revertsStatus: boolean, edit: () => void }[] = [
    { name: "date changes", revertsStatus: true, edit: () => appointmentEdit.getDateTimeLookup().open().select(dayjs("2025-12-22"), confirmedAppointment.time) },
    { name: "time changes", revertsStatus: true, edit: () => appointmentEdit.getDateTimeLookup().open().select(confirmedAppointment.date, "11:00") },
    { name: "service changes", revertsStatus: true, edit: () => appointmentEdit.getServiceLookup().select("Service2") },
    { name: "client changes", revertsStatus: true, edit: () => appointmentEdit.getClientLookup().select("Client2") },
    { name: "only duration changes", revertsStatus: false, edit: () => appointmentEdit.getDurationLookup().select("00:45") },
  ];

  // --- Unsaved edits survive leaving the form and coming back ---
  // Adding a client mid-booking and then opening that client's page takes the user off the edit
  // form; the browser Back button must bring every in-progress edit back with them.
  it("Should keep unsaved edits when leaving the edit form to a client's page and coming back", () => {
    let appointment = {
      client: "Client1",
      service: getTestService("Service1"),
      date: dayjs("2025-11-10"),
      time: "09:00",
      duration: "00:30"
    };

    let newDate = dayjs("2025-11-17");
    let newTime = "13:00";
    let newDuration = "00:45";
    let newClient = "Newcomer Person";
    let newNotes = "brings her own shampoo";

    appointments.openScrollerView();
    appointments.getCurrentDate().then(currentDate => {
      appointments.plusButton();
      editAndSaveAppointment(appointment, undefined, currentDate);
    });

    expectAppointment(appointment).then(item => {
      appointments.list().viewAppointment(item.id);
      appointmentView.edit();

      appointmentEdit.getDateTimeLookup().open().select(newDate, newTime);
      appointmentEdit.getDurationLookup().select(newDuration);
      appointmentEdit.getNotes().type(newNotes);
      appointmentEdit.getClientLookup().addNew(newClient);

      toast.expectVisible().expectAction("pen").clickAction("pen");
      expectURL(/\/clients\/edit\/\d+/);

      cy.go("back");

      appointmentEdit.getDateTimeLookup().expectSelected(newDate, newTime);
      appointmentEdit.getDurationLookup().expectSelected(newDuration);
      appointmentEdit.getClientLookup().expectSelected(newClient.split(" ")[0]);
      appointmentEdit.getServiceLookup().expectSelected(appointment.service.displayName);
      appointmentEdit.getNotes().expectText(newNotes);
    });
  });

  for (let option of statusRevertOptions) {
    it(`Should ${option.revertsStatus ? "revert Confirmed to Unconfirmed" : "keep Confirmed status"} when ${option.name}`, () => {
      createConfirmAndOpen().then(() => {
        appointmentView.edit();
        option.edit();
        appointmentEdit.save();

        toast.expectVisible();
        if (option.revertsStatus) {
          toast.expectAction("check");
        }
        else {
          toast.expectNoAction("check");
        }
      });
    });
  }
})
