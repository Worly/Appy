import { Component, EventEmitter, Input, Output } from "@angular/core";
import { HolidayListItem } from "src/app/models/holiday";
import { TimeOff } from "src/app/models/time-off";
import { TranslateService } from "src/app/components/translate/translate.service";
import { holidayAsTimeOff, timeOffRecurringRangeText, timeOffScheduleText, timeOffTimeText } from "../../time-off-display";

@Component({
  selector: "app-single-time-off-list-item",
  templateUrl: "./single-time-off-list-item.component.html",
  styleUrls: ["./single-time-off-list-item.component.scss"],
})
export class SingleTimeOffListItemComponent {
  private _timeOff?: TimeOff;
  @Input() set timeOff(value: TimeOff) {
    this._timeOff = value;
    this.render();
  }
  get timeOff(): TimeOff {
    return this._timeOff!;
  }

  @Output() onOpenView: EventEmitter<void> = new EventEmitter();

  public label: string = "";
  public schedule: string = "";
  public dateRange: string = "";
  public time: string = "";
  public badge: "none" | "edited" | "removed" = "none";
  public removed: boolean = false;

  private _holiday?: HolidayListItem;
  @Input() set holiday(value: HolidayListItem | undefined) {
    this._holiday = value;
    this.renderHoliday();
  }
  get holiday(): HolidayListItem | undefined { return this._holiday; }

  constructor(private translateService: TranslateService) {}

  private renderHoliday(): void {
    const h = this._holiday;
    if (h == null) return;
    const proj = holidayAsTimeOff(h);

    const tr = (k: string) => this.translateService.translate(k);
    this.label = h.name;
    this.schedule = timeOffScheduleText(proj, tr, this.translateService.getSelectedLanguageCode());
    this.dateRange = "";
    this.time = timeOffTimeText(proj, tr);
    this.removed = h.isRemoved;
    this.badge = h.isRemoved ? "removed" : (h.isEdited ? "edited" : "none");
  }

  private render(): void {
    const t = this._timeOff;
    if (t == null) return;
    const tr = (k: string) => this.translateService.translate(k);
    this.label = t.label ?? "";
    this.schedule = timeOffScheduleText(t, tr, this.translateService.getSelectedLanguageCode());
    this.dateRange = timeOffRecurringRangeText(t, tr);
    this.time = timeOffTimeText(t, tr);
  }
}
