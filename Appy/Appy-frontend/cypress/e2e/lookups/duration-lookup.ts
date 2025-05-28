import { getElement } from "cypress/support/commands";

export function durationLookup(elementSelector: string) {
  return {
    getSelected() {
      return getElement(elementSelector).then(el => {
        let text = el.text().trim();
        let duration: string | null = text.includes("Choose duration") ? null : text;
        return Promise.resolve(duration);
      })
    },

    expectSelected(duration: string | null) {
      this.getSelected().then(selected => {
        expect(selected).to.equal(duration);
      })

      return this;
    },

    select(duration: string) {
      getElement(elementSelector).click();
      cy.contains(duration).click();

      this.expectSelected(duration);
    },
  };
}