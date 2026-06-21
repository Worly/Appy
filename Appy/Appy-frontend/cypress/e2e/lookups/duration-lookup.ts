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
      // .should() retries the read+assert — the edit form fetches the appointment after the
      // popup opens, so the lookup briefly shows the "Choose duration" placeholder (null) before
      // it populates. A one-shot read races that fetch and flakes in CI (where everything is slower).
      getElement(elementSelector).should(el => {
        let text = el.text().trim();
        let duration2: string | null = text.includes("Choose duration") ? null : text;
        expect(duration2).to.equal(duration);
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