import { getElement } from "cypress/support/commands";

export function clientLookup(elementSelector: string) {
  return {
    getSelected() {
      return getElement(elementSelector).then(el => {
        let text = el.text().trim();
        let selectedClient: string | null = text.includes("Choose client") ? null : text.split(" ")[0];
        return Promise.resolve(selectedClient);
      })
    },

    expectSelected(client: string | null) {
      this.getSelected().then(selected => {
        expect(selected).to.equal(client);
      })

      return this;
    },

    select(client: string) {
      getElement(elementSelector).click();
      cy.contains(client).click();

      this.expectSelected(client);

      return this;
    },
  };
}