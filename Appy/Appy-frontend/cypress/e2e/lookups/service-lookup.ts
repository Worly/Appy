import { getElement } from "cypress/support/commands";

export function serviceLookup(elementSelector: string) {
  return {
    getSelected() {
      return getElement(elementSelector).then(el => {
        let text = el.text().trim();
        let selectedService: string | null = text.includes("Choose service") ? null : text;
        return Promise.resolve(selectedService);
      })
    },

    expectSelected(service: string | null) {
      this.getSelected().then(selected => {
        expect(selected).to.equal(service);
      })

      return this;
    },

    select(service: string) {
      getElement(elementSelector).click();
      cy.contains(service).click();

      this.expectSelected(service);

      return this;
    }
  };
}