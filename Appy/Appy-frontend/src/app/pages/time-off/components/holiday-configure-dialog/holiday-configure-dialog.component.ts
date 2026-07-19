import { Component, EventEmitter, Input, Output, ViewChild } from "@angular/core";
import { filter, take } from "rxjs";
import { HolidayImportSettings, SupportedCountry } from "src/app/models/holiday";
import { DialogComponent } from "src/app/components/dialog/dialog.component";
import { HolidayService } from "../../services/holiday.service";

// The Holidays tab's auto-import configuration: pick a country and save. When the country changes while
// holidays are already imported, a confirm dialog gates the save first (re-importing drops future rows).
@Component({
  selector: "app-holiday-configure-dialog",
  templateUrl: "./holiday-configure-dialog.component.html",
  styleUrls: ["./holiday-configure-dialog.component.scss"],
})
export class HolidayConfigureDialogComponent {
  @Input() hasImportedHolidays: boolean = false;
  @Output() saved: EventEmitter<void> = new EventEmitter();

  public settings?: HolidayImportSettings;
  public countries: SupportedCountry[] = [];
  public selectedCountryCode?: string;
  public savingSettings: boolean = false;

  @ViewChild("configureDialog") configureDialog?: DialogComponent;
  @ViewChild("confirmChangeDialog") confirmChangeDialog?: DialogComponent;

  constructor(private holidayService: HolidayService) { }

  public open(): void {
    this.holidayService.getSettings().subscribe(s => {
      this.settings = s;
      this.selectedCountryCode = s.countryCode;
      this.holidayService.getSupportedCountries().data$
        .pipe(filter(cs => cs != null), take(1))
        .subscribe(cs => this.countries = cs ?? []);
      this.configureDialog?.open();
    });
  }

  public countryDisplay = (c: SupportedCountry): string => c.countryCode + " - " + c.name;

  public get selectedCountry(): SupportedCountry | undefined {
    return this.countries.find(c => c.countryCode === this.selectedCountryCode);
  }

  public confirmConfigure(): void {
    const changing = this.selectedCountryCode !== this.settings?.countryCode;
    if (changing && this.hasImportedHolidays && this.settings?.countryCode != null) {
      this.configureDialog?.close();
      this.confirmChangeDialog?.open();
      return;
    }
    this.saveSettings();
  }

  public saveSettings(): void {
    this.savingSettings = true;
    const settings = new HolidayImportSettings({ countryCode: this.selectedCountryCode });
    this.holidayService.saveSettings(settings).subscribe({
      next: () => {
        this.savingSettings = false;
        this.configureDialog?.close();
        this.confirmChangeDialog?.close();
        this.saved.next();
      },
      error: () => { this.savingSettings = false; },
    });
  }
}
