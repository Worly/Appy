import { Component, Input } from "@angular/core";
import { TimeOff } from "src/app/models/time-off";
import { TranslateService } from "src/app/components/translate/translate.service";
import { timeOffDayCountText, timeOffRecurringRangeText, timeOffScheduleText, timeOffTimeText } from "../../time-off-display";

// Presentational shell for a time-off / holiday details view: the umbrella header, optional holiday
// provenance, and the schedule/time info-card. It renders the schedule and time from the given TimeOff,
// so an active time-off and a removed holiday (projected onto a one-off via holidayAsTimeOff) feed it
// the same way. Callers project the rest (notes, changes block, action buttons) through <ng-content>.
@Component({
  selector: "app-time-off-details-card",
  templateUrl: "./time-off-details-card.component.html",
  styleUrls: ["./time-off-details-card.component.scss"],
})
export class TimeOffDetailsCardComponent {
  @Input() label: string = "";
  @Input() struck: boolean = false;
  @Input() badge?: string;         // "edited" | "removed"
  @Input() countryCode?: string;   // when set, renders the public-holiday provenance line
  @Input() timeOff!: TimeOff;
  @Input() dataTest?: string;

  constructor(private translateService: TranslateService) { }

  public get schedule(): string { return timeOffScheduleText(this.timeOff, this.tr, this.lang); }
  public get dateRange(): string { return timeOffRecurringRangeText(this.timeOff, this.tr); }
  public get dayCount(): string { return timeOffDayCountText(this.timeOff, this.tr, this.lang); }
  public get time(): string { return timeOffTimeText(this.timeOff, this.tr); }

  private get tr(): (key: string) => string { return (k: string) => this.translateService.translate(k); }
  private get lang(): string { return this.translateService.getSelectedLanguageCode(); }
}
