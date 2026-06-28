import { expectURL, expectURLs, getElement, getElements } from "cypress/support/commands"
import dayjs, { Dayjs } from 'dayjs';
import { clientLookup } from "../lookups/client-lookup";
import { serviceLookup } from "../lookups/service-lookup";
import { durationLookup } from "../lookups/duration-lookup";
import { dateLookup } from "../lookups/date-lookup";
import duration from "dayjs/plugin/duration";
import customParseFormat from "dayjs/plugin/customParseFormat"
import { AppointmentStatus } from "src/app/models/appointment";

dayjs.extend(duration);
dayjs.extend(customParseFormat);

export class AppointmentInList {
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

export let appointments = {
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

          // Wait until the current-date element shows a valid date before reading it.
          // The list loads asynchronously; reading too early yields empty text and an invalid dayjs.
          // .should() retries until the assertion passes, then .then() safely reads the value.
          getElement("appointments-list-current-date")
            .should(el => {
              let text = el.text().trim().split(" ")[0];
              expect(dayjs(text, "DD.MM.YYYY").isValid()).to.be.true;
            })
            .then(currentDateElement => {
              let currentDateText = currentDateElement.text().trim().split(" ")[0];
              let currentDate = dayjs(currentDateText, "DD.MM.YYYY");

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

  expectCurrentDate(date: Dayjs) {
    this.checkView();

    dateLookup("appointments-date-selector").expectSelected(date);
  },

  jumpToDay(date: Dayjs) {
    this.checkView();

    dateLookup("appointments-date-selector").select(date);

    // A jump must bring the day into view on its own — the test never scrolls in the jump path.
    // In list view, wait until the list has actually positioned itself at the target day before
    // returning, so callers can read it directly. (The current-date element exists only in list
    // view; the scroller renders the selected day directly and needs no extra wait.)
    this.getCurrentView().then(view => {
      if (view == "list") {
        getElement("appointments-list-current-date").should("contain", date.format("DD.MM.YYYY"));
      }
    });
  },

  plusButton() {
    this.checkView();

    return getElement("appointment-new-button").click();
  }
}

export let appointmentEdit = {
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

export let appointmentView = {
  edit() {
    getElement("appointment-edit-button").click();

    return appointmentEdit;
  },

  expectStatus(status: AppointmentStatus) {
    // Read the status off the single status element's data-test-data attribute (not the
    // rendered label, which is translated) and assert it equals the expected value.
    // .should() retries the read so it tolerates the detail panel rendering asynchronously.
    getElement("appointment-status-lookup-value").should(el => {
      expect(el.attr("data-test-data")).to.equal(status);
    });
    return this;
  }
}
