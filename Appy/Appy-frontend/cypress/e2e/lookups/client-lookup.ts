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
      // .should() retries the read+assert — the edit form fetches the appointment after the
      // popup opens, so the lookup briefly shows the "Choose client" placeholder (null) before
      // it populates. A one-shot read races that fetch and flakes in CI (where everything is slower).
      getElement(elementSelector).should(el => {
        let text = el.text().trim();
        let selectedClient: string | null = text.includes("Choose client") ? null : text.split(" ")[0];
        expect(selectedClient).to.equal(client);
      })

      return this;
    },

    select(client: string) {
      getElement(elementSelector).click();
      cy.contains(client).click();

      this.expectSelected(client);

      return this;
    },

    // Creates the client from the popup's search text, the way a user adds someone mid-booking.
    // The new client is selected on success and the popup closes on its own.
    addNew(nameSurname: string) {
      getElement(elementSelector).click();
      getElement("client-lookup-search").find("input").type(nameSurname);
      getElement("client-lookup-new-button").click();

      this.expectSelected(nameSurname.split(" ")[0]);

      return this;
    },
  };
}