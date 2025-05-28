import { getElement } from "cypress/support/commands";
import dayjs, { Dayjs } from "dayjs";

export function dateLookup(elementSelector: string) {
  return {
    getSelected() {
      return getElement(elementSelector).then(el => {
        let text = el.text().trim();
        let split = text.split(".")

        return dayjs(`20${split[2]}-${split[1]}-${split[0]}`);
      })
    },

    expectSelected(date: Dayjs) {
      this.getSelected().then(selected => {
        expect(selected.isSame(date, 'day')).to.be.true;
      })

      return this;
    },

    previous() {
      getElement(elementSelector).get("[data-test=date-selector-previous-button]").click();

      return this;
    },

    next() {
      getElement(elementSelector).get("[data-test=date-selector-next-button]").click();

      return this;
    },

    select(wantedDate: Dayjs) {
      this.getSelected().then(selectedDate => {
        if (wantedDate.isSame(selectedDate, 'day')) {
          return;
        }

        getElement(elementSelector).click();

        var yearDiff = wantedDate.year() - selectedDate.year();
        if (yearDiff != 0) {
          getElement("calendar-period-button").click();

          if (yearDiff > 0) {
            getElement("calendar-next-button").as("scollButton");
          }
          else {
            getElement("calendar-previous-button").as("scollButton");
          }

          for (let i = 0; i < Math.abs(yearDiff); i++) {
            cy.get("@scollButton").click();
          }

          getElement("calendar-period-button").click();
        }

        if (wantedDate.month() != selectedDate.month()) {
          getElement("calendar-period-button").click();

          cy.get("mat-calendar").contains(wantedDate.format("MMM"), { matchCase: false }).click();
        }

        cy.get("mat-calendar").contains(wantedDate.date()).click().then(() => {
          let cal = cy.$$("mat-calendar")
          if (cal.length > 0) {
            // If the calendar is still open, close it
            getElement("dialog-close-button").click();
          }
        })

        this.expectSelected(wantedDate);
      })

      return this;
    }
  };
}