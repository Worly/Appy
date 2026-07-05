import { Component, EventEmitter, Input, OnDestroy, Output, ViewChild } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { TimeOff, TimeOffRecurrence } from "src/app/models/time-off";
import { Holiday } from "src/app/models/holiday";
import { TranslateService } from "src/app/components/translate/translate.service";
import { DialogComponent } from "src/app/components/dialog/dialog.component";
import { TimeOffService } from "../../services/time-off.service";
import { HolidayService } from "../../services/holiday.service";
import { timeOffDayCountText, timeOffRecurringRangeText, timeOffScheduleText, timeOffTimeText } from "../../time-off-display";
import { NotifyDialogService } from "src/app/components/notify-dialog/notify-dialog.service";

@Component({
  selector: "app-single-time-off",
  templateUrl: "./single-time-off.component.html",
  styleUrls: ["./single-time-off.component.scss"],
})
export class SingleTimeOffComponent implements OnDestroy {
  private _id?: number;
  @Input() set id(value: number | undefined) {
    if (this._id === value) return;
    this._id = value;
    this.setDatasource(value);
  }
  get id(): number | undefined {
    return this._id;
  }

  @Output() onDone: EventEmitter<void> = new EventEmitter();
  @Output() onChanged: EventEmitter<void> = new EventEmitter();

  public timeOff?: TimeOff;
  public isLoading: boolean = false;
  public schedule: string = "";
  public dateRange: string = "";
  public dayCount: string = "";
  public time: string = "";

  // Only active/edited holidays reach this view; removed ones open the restore dialog.
  public holidayModel?: Holiday;
  public isHolidayEdited = false;
  public changedDate = false;
  public changedTime = false;

  private _holiday?: Holiday;
  @Input() set holiday(value: Holiday | undefined) {
    this._holiday = value;
    if (value != null) this.applyHoliday(value);
  }
  get holiday(): Holiday | undefined { return this._holiday; }

  private sub?: Subscription;

  constructor(
    private timeOffService: TimeOffService,
    private translateService: TranslateService,
    private router: Router,
    private holidayService: HolidayService,
    private notifyDialogService: NotifyDialogService
  ) { }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private applyHoliday(h: Holiday): void {
    this._holiday = h;
    this.holidayModel = h;
    this.isHolidayEdited = h.isEdited;
    this.changedDate = h.date != null && h.originalDate != null && !h.date.isSame(h.originalDate, "date");
    this.changedTime = !h.isAllDay;
    // Build via DTO constructor so property setters (which trigger validation) fire only once, after initProperties.
    const proj = new TimeOff({
      id: 0,
      recurrence: TimeOffRecurrence.OneOff,
      startDate: h.date?.format("YYYY-MM-DD"),
      endDate: h.date?.format("YYYY-MM-DD"),
      isAllDay: h.isAllDay,
      timeFrom: h.timeFrom?.format("HH:mm:ss"),
      timeTo: h.timeTo?.format("HH:mm:ss"),
    });
    const tr = (k: string) => this.translateService.translate(k);
    this.schedule = timeOffScheduleText(proj, tr, this.translateService.getSelectedLanguageCode());
    this.time = timeOffTimeText(proj, tr);
  }

  private setDatasource(id: number | undefined): void {
    this.sub?.unsubscribe();
    this.timeOff = undefined;
    if (id == null) return;

    this.isLoading = true;
    this.sub = this.timeOffService.get(id).subscribe(t => {
      this.timeOff = t;
      const tr = (k: string) => this.translateService.translate(k);
      this.schedule = timeOffScheduleText(t, tr, this.translateService.getSelectedLanguageCode());
      this.dateRange = timeOffRecurringRangeText(t, tr);
      this.dayCount = timeOffDayCountText(t, tr, this.translateService.getSelectedLanguageCode());
      this.time = timeOffTimeText(t, tr);
      this.isLoading = false;

      if (t.importedHolidayId != null) {
        this.holidayService.getById(t.importedHolidayId).subscribe(h => this.applyHoliday(h));
      }
    });
  }

  public goToEdit(): void {
    if (this._id == null) return;
    this.router.navigate(["time-off", "edit", this._id]);
    this.onDone.next();
  }

  public goToEditHoliday(): void {
    if (this._holiday == null) return;
    this.router.navigate(["time-off", "holiday", "edit", this._holiday.id]);
    this.onDone.next();
  }

  public openRevertDialog(): void {
    this.notifyDialogService.yesNoDialog(this.translateService.translate("pages.time-off.REVERT_CONFIRM")).subscribe((ok: boolean) => {
      if (!ok) return;
      if (this._holiday == null) return;

      this.holidayService.revert(this._holiday.id).subscribe(() => {
        this.onChanged.next();
        this.onDone.next();
      });
    });
  }

  public openRemoveDialog(): void {
    this.notifyDialogService.yesNoDialog(this.translateService.translate("pages.time-off.REMOVE_CONFIRM")).subscribe((ok: boolean) => {
      if (!ok) return;
      if (this._holiday == null) return;

      this.holidayService.remove(this._holiday.id).subscribe(() => {
        this.onChanged.next();
        this.onDone.next();
      });
    });
  }
}
