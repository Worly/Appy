import { expectURL, expectURLs, getElement, getElements, login } from "cypress/support/commands"
import dayjs, { Dayjs } from 'dayjs';
import { clientLookup } from "./lookups/client-lookup";
import { serviceLookup } from "./lookups/service-lookup";
import { durationLookup } from "./lookups/duration-lookup";
import { dateLookup } from "./lookups/date-lookup";
import { parseDuration } from "src/app/utils/time-utils";
import duration from "dayjs/plugin/duration";
import customParseFormat from "dayjs/plugin/customParseFormat"

dayjs.extend(duration);
dayjs.extend(customParseFormat);

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

            this.scrollToDay(date);
          })
        })

        return this;
      },

      getAppointments() {
        return cy.then(() => {
          let list = cy.$$("[data-test=appointments-list]").first();
          // return getElement("appointments-list").then(list => {
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

      parseAppointment(el: HTMLElement) {
        let timeFromTo = cy.$$("[data-test=single-appointment-time]", el).text().trim();
        let service = cy.$$("[data-test=single-appointment-service]", el).text().trim();
        let client = cy.$$("[data-test=single-appointment-client]", el).text().trim();

        return {
          timeFrom: timeFromTo.split(" - ")[0],
          timeTo: timeFromTo.split(" - ")[1],
          service: service,
          client: client.split(" ")[0],
        }
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

      getAppointments() {
        return getElements("single-appointment").then(appointments => {
          return appointments.toArray().map((el) => this.parseAppointment(el));
        });
      },

      parseAppointment(el: HTMLElement) {
        let timeFromTo = cy.$$("[data-test=appointment-time]", el).text().trim();
        let serviceClient = cy.$$("[data-test=appointment-service-client]", el).text().trim();

        return {
          timeFrom: timeFromTo.split(" - ")[0],
          timeTo: timeFromTo.split(" - ")[1],
          service: serviceClient.split(" - ")[0],
          client: serviceClient.split(" - ")[1].split(" ")[0],
        }
      }
    }
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
    expectURLs("/appointments/edit", "/appointments/new");
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

  editDateTime() {
    this.checkView();

    getElement("appointment-edit-date-time-lookup").click();

    return {
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

      select(date: Dayjs, time: string) {
        this.selectDate(date);
        this.selectTime(time);

        this.ok();

        return this;
      }
    }
  },

  save() {
    this.checkView();

    getElement("appointment-edit-save-button").click();
  },
}

function addAppointment(data: {
  client: string,
  service: string,
  duration: string,
  date: Dayjs,
  time: string
}, check?: {
  view: "list" | "scroller",
  scrollType: "scroll" | "jump"
}) {
  appointments.plusButton();

  let time = dayjs(data.time, "HH:mm");
  let timeTo = time.add(parseDuration(data.duration + ":00"));

  appointmentEdit.getClientLookup().expectSelected(null).select(data.client);
  appointmentEdit.getServiceLookup().expectSelected(null).select(data.service);
  appointmentEdit.getDurationLookup().expectSelected("00:30").select(data.duration);
  appointmentEdit.editDateTime().select(data.date, data.time);
  appointmentEdit.save();

  if (check != null) {
    if (check.view == "list") {
      appointments.openListView();
    }
    else {
      appointments.openScrollerView();
    }

    if (check.scrollType == "jump") {
      appointments.jumpToDay(data.date);
    }
    else {
      if (check.view == "list") {
        appointments.list().scrollToDay(data.date);
      }
      else {
        appointments.scroller().scrollToDay(data.date);
      }
    }

    let view = check.view == "list" ? appointments.list() : appointments.scroller();

    view.getAppointments().then(appointments => {
      var index = appointments.findIndex(a => 
        a.client == data.client && 
        a.service == data.service && 
        a.timeFrom == data.time && 
        a.timeTo == timeTo.format("HH:mm"))
        
      expect(index).to.be.greaterThan(-1, "Appointment not found in the list");
    });
  }
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
      name: "mid appointments",
      date: dayjs("2021-02-09"),
      time: "08:40",
      duration: "00:20",
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
      // {
      //   view: "list",
      //   scrollType: "jump"
      // },
      {
        view: "scroller",
        scrollType: "scroll"
      },
      {
        view: "scroller",
        scrollType: "jump"
      }
    ]

  for (let creationOption of creationOptions) {
    for (let checkingOption of checkingOptions) {
      it('Should be able to add an appointment : ' + creationOption.name + " : " + checkingOption.view + " " + checkingOption.scrollType, () => {
        let client = "Client1";
        let service = "Service1";

        addAppointment({
          client: client,
          service: service,
          date: creationOption.date,
          time: creationOption.time,
          duration: creationOption.duration
        }, {
          view: checkingOption.view,
          scrollType: checkingOption.scrollType
        })
      })
    }
  }
})
