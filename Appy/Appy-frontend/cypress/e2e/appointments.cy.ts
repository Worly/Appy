import { expectURL, expectURLs, getElement, getElements, login } from "cypress/support/commands"
import dayjs, { Dayjs } from 'dayjs';
import { clientLookup } from "./lookups/client-lookup";
import { serviceLookup } from "./lookups/service-lookup";
import { durationLookup } from "./lookups/duration-lookup";
import { dateLookup } from "./lookups/date-lookup";
import { parseDuration } from "src/app/utils/time-utils";
import duration from "dayjs/plugin/duration";
import customParseFormat from "dayjs/plugin/customParseFormat"
import { getTestService, TestService } from "./test-data";

dayjs.extend(duration);
dayjs.extend(customParseFormat);

class AppointmentInList {
  id: number;
  timeFrom: string;
  timeTo: string;
  service: string;
  client: string;

  constructor(id: number, timeFrom: string, timeTo: string, service: string, client: string) {
    this.id = id;
    this.timeFrom = timeFrom;
    this.timeTo = timeTo;
    this.service = service;
    this.client = client;
  }
}

let appointments = {
  checkView() {
    expectURL("/appointments");
  },

  getCurrentView() {
    this.checkView();

    return getElement("appointment-view-switch-button").then(el => {
      let view = el.attr("data-test-data")

      if (view == "scroller") {
        return "scroller";
      }
      else if (view == "list") {
        return "list";
      }
      else {
        throw new Error("Unknown view: " + view);
      }
    })
  },

  openListView() {
    this.checkView();

    this.getCurrentView().then(view => {
      if (view == "scroller") {
        getElement("appointment-view-switch-button").click();
      }
    })
  },

  openScrollerView() {
    this.checkView();

    this.getCurrentView().then(view => {
      if (view == "list") {
        getElement("appointment-view-switch-button").click();
      }
    })
  },

  list() {
    this.checkView();
    this.openListView();

    return {
      scrollToDay(date: Dayjs) {
        let dateStr = date.format("DD.MM.YYYY");

        getElement("appointments-list").then(list => {
          let dateElement = list.find("[data-test=appointments-list-item][data-test-data=date]")
            .filter((_, el) => el.textContent?.includes(dateStr) == true)

          if (dateElement.length > 0) {
            cy.wrap(dateElement).scrollIntoView()
            return;
          }

          getElement("appointments-list-current-date").then(currentDateElement => {
            let currentDateText = currentDateElement.text().trim().split(" ")[0];
            let currentDate = dayjs(currentDateText, "DD.MM.YYYY");
            expect(currentDate.isValid()).to.be.true;

            if (date.isBefore(currentDate)) {
              cy.scrollTo("top");
            }
            else {
              cy.scrollTo("bottom");
            }

            // wait for the list to update and start loading
            cy.wait(50);

            this.scrollToDay(date);
          })
        })

        return this;
      },

      viewAppointment(id: number) {
        cy.get(`[data-test=appointments-list-item] [data-appId=${id}]`).first().click();
      },

      getAppointments() {
        return cy.then(() => {
          let list = cy.$$("[data-test=appointments-list]").first();
          let currentDate = list.find("[data-test=appointments-list-item][data-test-data=date]")
            .filter((_, el) => (el.getBoundingClientRect().top + el.getBoundingClientRect().bottom) / 2 >= 0)
            .first();

          let items = list.find("[data-test=appointments-list-item]")

          let indexOfCurrentDate = items.index(currentDate);
          let indexOfNextDate = items.toArray().findIndex((el, index) => index > indexOfCurrentDate && el.getAttribute("data-test-data")?.includes("date"));

          let appointments = items.slice(indexOfCurrentDate + 1, indexOfNextDate == -1 ? undefined : indexOfNextDate);

          return appointments.toArray().map((el) => this.parseAppointment(el));
        })
      },

      parseAppointment(el: HTMLElement): AppointmentInList {
        let id = parseInt(cy.$$("[data-appId]", el).attr("data-appId") ?? "0");
        let timeFromTo = cy.$$("[data-test=single-appointment-time]", el).text().trim();
        let service = cy.$$("[data-test=single-appointment-service]", el).text().trim();
        let client = cy.$$("[data-test=single-appointment-client]", el).text().trim();

        return new AppointmentInList(
          id,
          timeFromTo.split(" - ")[0],
          timeFromTo.split(" - ")[1],
          service,
          client.split(" ")[0],
        );
      }
    }
  },

  scroller() {
    this.checkView();
    this.openScrollerView();

    return {
      scrollToDay(date: Dayjs) {
        let dateLookupInstance = dateLookup("appointments-date-selector");

        dateLookupInstance.getSelected().then(currentDate => {
          let diff = date.diff(currentDate, 'day');

          for (let i = 0; i < Math.abs(diff); i++) {
            if (diff > 0) {
              dateLookupInstance.next();
            }
            else {
              dateLookupInstance.previous();
            }
          }
        })

        return this;
      },

      viewAppointment(id: number) {
        cy.get(`[data-test=single-appointment][data-appId=${id}]`).first().click();
      },

      getAppointments() {
        return getElements("single-appointment").then(appointments => {
          return appointments.toArray().map((el) => this.parseAppointment(el));
        });
      },

      parseAppointment(el: HTMLElement) {
        let id = parseInt(el.getAttribute("data-appId") ?? "0");
        let timeFromTo = cy.$$("[data-test=appointment-time]", el).text().trim();
        let serviceClient = cy.$$("[data-test=appointment-service-client]", el).text().trim();

        return new AppointmentInList(
          id,
          timeFromTo.split(" - ")[0],
          timeFromTo.split(" - ")[1],
          serviceClient.split(" - ")[0],
          serviceClient.split(" - ")[1].split(" ")[0]
        );
      }
    }
  },

  getCurrentDate() {
    this.checkView();

    return dateLookup("appointments-date-selector").getSelected();
  },

  jumpToDay(date: Dayjs) {
    this.checkView();

    dateLookup("appointments-date-selector").select(date);
  },

  plusButton() {
    this.checkView();

    return getElement("appointment-new-button").click();
  }
}

let appointmentEdit = {
  checkView() {
    expectURLs(/\/appointments\/edit\/\d+/, /\/appointments\/new/);
  },

  getClientLookup() {
    this.checkView();
    return clientLookup("appointment-edit-client-lookup");
  },

  getServiceLookup() {
    this.checkView();
    return serviceLookup("appointment-edit-service-lookup");
  },

  getDurationLookup() {
    this.checkView();
    return durationLookup("appointment-edit-duration-picker");
  },

  getDateTimeLookup() {
    this.checkView();

    return {
      getSelectedDate() {
        return getElement("appointment-edit-date-time-lookup").then(el => {
          let text = el.text().trim();
          let parts = text.split(" - ");

          return dayjs(parts[1], "DD.MM.YYYY");
        });
      },

      getSelectedTime() {
        return getElement("appointment-edit-date-time-lookup").then(el => {
          let text = el.text().trim();
          let parts = text.split(" - ");

          if (parts.length < 3) {
            return Promise.resolve(null);
          }

          return Promise.resolve(parts[2].trim());
        });
      },

      expectSelected(date: Dayjs, time: string | null) {
        this.getSelectedDate().then(selectedDate => {
          expect(selectedDate.isSame(date, 'day')).to.be.true;
        });

        this.getSelectedTime().then(selectedTime => {
          expect(selectedTime).to.equal(time);
        });

        return this;
      },

      open() {
        getElement("appointment-edit-date-time-lookup").click();

        return {
          lookup: this,

          selectDate(date: Dayjs) {
            dateLookup("date-selector").select(date);

            return this;
          },

          selectTime(time: string) {
            expect(time).to.match(/^\d{2}:\d{2}$/);

            let hour = time.split(":")[0];
            let minute = time.split(":")[1];

            getElement("date-time-picker-hour-buttons").contains(hour).click();
            getElement("date-time-picker-minute-buttons").contains(minute).click();

            return this;
          },

          ok() {
            getElement("date-time-picker-ok-button").click();
          },

          cancel() {
            getElement("date-time-picker-cancel-button").click();
          },

          select(date: Dayjs, time: string) {
            this.selectDate(date);
            this.selectTime(time);

            this.ok();

            this.lookup.expectSelected(date, time);

            return this;
          }
        };
      }
    };
  },

  save() {
    this.checkView();

    getElement("appointment-edit-save-button").click();
  },
}

let appointmentView = {
  edit() {
    getElement("appointment-edit-button").click();

    return appointmentEdit;
  }
}

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
) {
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

  let view = viewType == "list" ? appointments.list() : appointments.scroller();
  return view.getAppointments().then(appointments => {
    var index = appointments.findIndex(a =>
      a.client == appointment.client &&
      a.service == appointment.service.displayName &&
      a.timeFrom == appointment.time &&
      a.timeTo == timeTo.format("HH:mm"))

    expect(index).to.be.greaterThan(-1, "Appointment not found in the list");

    return appointments[index];
  });
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
      // TODO: fix jump scroll in list view
      // {
      //   view: "list",
      //   scrollType: "jump"
      // },
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
})
