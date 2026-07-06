import { login } from "../support/commands";
import { holidays, holidayConfigure } from "./pages/time-off";

describe("Holidays", () => {
  beforeEach(() => login("appointments"));

  it("imports a country's holidays and lists them", () => {
    holidays.openTab().configureViaEmptyState();
    holidayConfigure.expectVisible().selectCountry("Croatia").import();

    holidays.openTab();
    holidays.expectRowContains("Nova Godina"); // New Year's Day (01.01), deterministic
  });

  it("edits a holiday's time, shows the Changes block, then reverts", () => {
    holidays.openTab().configureViaEmptyState();
    holidayConfigure.selectCountry("Croatia").import();

    holidays.openTab();
    const details = holidays.openRow("Nova Godina");
    details.edit().toggleAllDay().save();

    holidays.openTab();
    const d2 = holidays.openRow("Nova Godina");
    d2.expectVisible().expectChanges();
    d2.revert();

    holidays.openTab();
    holidays.openRow("Nova Godina").expectVisible().expectNoChanges();
  });

  it("removes a holiday then restores it", () => {
    holidays.openTab().configureViaEmptyState();
    holidayConfigure.selectCountry("Croatia").import();

    holidays.openTab();
    holidays.openRow("Nova Godina").remove();

    holidays.openTab();
    holidays.openRemovedRow("Nova Godina").restore();

    holidays.openTab();
    holidays.openRow("Nova Godina").expectVisible();
  });
});
