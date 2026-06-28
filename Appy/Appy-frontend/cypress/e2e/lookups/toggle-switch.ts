import { getElement } from "cypress/support/commands";

/** Flip an app-toggle-switch addressed by its data-test attribute. Reusable by any page. */
export function toggleSwitch(elementSelector: string) {
  getElement(elementSelector).find(".switch").click();
}
