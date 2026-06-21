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
      // .should() retries the read+assert — the edit form fetches the appointment after the
      // popup opens, so the lookup briefly shows the "Choose service" placeholder (null) before
      // it populates. A one-shot read races that fetch and flakes in CI (where everything is slower).
      getElement(elementSelector).should(el => {
        let text = el.text().trim();
        let selectedService: string | null = text.includes("Choose service") ? null : text;
        expect(selectedService).to.equal(service);
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