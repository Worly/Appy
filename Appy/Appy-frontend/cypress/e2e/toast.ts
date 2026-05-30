import { getElement } from "cypress/support/commands";

// Reusable interaction helper for the global app-toast popup. Kept generic so it can test
// any toast, not just the appointment-confirm one: action buttons are addressed by their
// icon name, matching the `[data-test=toast-action-<icon>]` attribute the toast renders.
export let toast = {
  expectVisible() {
    getElement("toast").should("be.visible");
    return this;
  },

  expectText(text: string) {
    getElement("toast").should("contain", text);
    return this;
  },

  expectAction(icon: string) {
    getElement("toast-action-" + icon).should("exist");
    return this;
  },

  expectNoAction(icon: string) {
    // getElement asserts the element exists (length 1), so it can't express absence —
    // scope a raw cy.get to the toast and assert the action button is not present.
    cy.get(`[data-test=toast] [data-test=toast-action-${icon}]`).should("not.exist");
    return this;
  },

  clickAction(icon: string) {
    getElement("toast-action-" + icon).click();
    return this;
  }
}
