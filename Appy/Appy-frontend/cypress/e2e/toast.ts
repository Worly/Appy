import { getElement } from "cypress/support/commands";

// The toast only renders inside the save/status network-response callback, so under CI load it
// can appear well after Cypress's default 4s command timeout. Wait longer for it to avoid flake.
const TOAST_TIMEOUT = 15000;

// Reusable interaction helper for the global app-toast popup. Kept generic so it can test
// any toast, not just the appointment-confirm one: action buttons are addressed by their
// icon name, matching the `[data-test=toast-action-<icon>]` attribute the toast renders.
export let toast = {
  expectVisible() {
    getElement("toast", { timeout: TOAST_TIMEOUT }).should("be.visible");
    return this;
  },

  expectText(text: string) {
    getElement("toast", { timeout: TOAST_TIMEOUT }).should("contain", text);
    return this;
  },

  expectAction(icon: string) {
    getElement("toast-action-" + icon, { timeout: TOAST_TIMEOUT }).should("exist");
    return this;
  },

  expectNoAction(icon: string) {
    // getElement asserts the element exists (length 1), so it can't express absence —
    // scope a raw cy.get to the toast and assert the action button is not present.
    cy.get(`[data-test=toast] [data-test=toast-action-${icon}]`, { timeout: TOAST_TIMEOUT }).should("not.exist");
    return this;
  },

  clickAction(icon: string) {
    getElement("toast-action-" + icon, { timeout: TOAST_TIMEOUT }).click();
    return this;
  }
}
