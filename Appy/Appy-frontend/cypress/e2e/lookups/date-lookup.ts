import { getElement } from "cypress/support/commands";
import dayjs, { Dayjs } from "dayjs";

export function dateLookup(elementSelector: string) {
  return {
    getSelected() {
      return getElement(elementSelector).then(el => parseSelectedDate(el.text()));
    },

    expectSelected(date: Dayjs) {
      // .should() re-reads the element text on each retry, so this tolerates the brief async
      // gap between navigation and the selector updating. (A getSelected().then() read would
      // not retry — .then() captures the value once.)
      getElement(elementSelector).should(el => {
        expect(parseSelectedDate(el.text()).isSame(date, 'day')).to.be.true;
      });

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

function parseSelectedDate(text: string): Dayjs {
  // Date selectors render either compact (DD.MM.YY) or full (DD.MM.YYYY), and may prefix the
  // localized weekday when showDayOfWeek is set ("Monday, 21.06.2026"). Pull the date out by
  // pattern so the optional prefix doesn't break parsing; normalise a 2-digit year to 4 digits.
  let match = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (match == null)
    throw new Error(`Could not parse a date from selector text: "${text}"`);
  let year = match[3].length <= 2 ? `20${match[3]}` : match[3];
  return dayjs(`${year}-${match[2]}-${match[1]}`);
}