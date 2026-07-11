import { Component, EventEmitter, Input, OnDestroy, Output } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, Subscription } from "rxjs";
import { TimeOff } from "src/app/models/time-off";
import { Holiday } from "src/app/models/holiday";
import { TranslateService } from "src/app/components/translate/translate.service";
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

  public isHolidayEdited = false;
  public changedDate = false;
  public changedTime = false;


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

  private setDatasource(id: number | undefined): void {
    this.sub?.unsubscribe();
    this.timeOff = undefined;
    this.isHolidayEdited = this.changedDate = this.changedTime = false;
    if (id == null) return;

    this.isLoading = true;
    this.sub = this.timeOffService.get(id).subscribe(t => {
      this.timeOff = t;
      this.isLoading = false;

      const tr = (k: string) => this.translateService.translate(k);
      const lang = this.translateService.getSelectedLanguageCode();
      this.schedule = timeOffScheduleText(t, tr, lang);
      this.dateRange = timeOffRecurringRangeText(t, tr);
      this.time = timeOffTimeText(t, tr);
      this.dayCount = timeOffDayCountText(t, tr, lang);

      if (t.holiday != null) {
        this.changedDate = t.startDate != null && !t.startDate.isSame(t.holiday.date, "date");
        this.changedTime = !t.isAllDay;
        this.isHolidayEdited = this.changedDate || this.changedTime;
      }
    });
  }

  // A holiday-linked time-off edits like any other — the editor loads it by id and enters holiday mode.
  public edit(): void {
    if (this._id == null) return;
    this.router.navigate(["time-off", "edit", this._id]);
    this.onDone.next();
  }

  public openRevertDialog(): void {
    this.confirmHolidayAction("pages.time-off.REVERT_CONFIRM", "holiday-revert-confirm", id => this.holidayService.revert(id));
  }

  public openRemoveDialog(): void {
    this.confirmHolidayAction("pages.time-off.REMOVE_CONFIRM", "holiday-remove-confirm", id => this.holidayService.remove(id));
  }

  private confirmHolidayAction(confirmKey: string, confirmDataTest: string, action: (id: number) => Observable<void>): void {
    this.notifyDialogService.yesNoDialog(this.translateService.translate(confirmKey), { confirmDataTest }).subscribe((ok: boolean) => {
      if (!ok || this.timeOff?.holiday == null) return;
      action(this.timeOff.holiday.id).subscribe(() => {
        this.onChanged.next();
        this.onDone.next();
      });
    });
  }
}
