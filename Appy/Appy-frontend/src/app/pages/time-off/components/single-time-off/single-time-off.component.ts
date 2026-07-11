import { Component, EventEmitter, Input, OnDestroy, Output } from "@angular/core";
import { Router } from "@angular/router";
import { Observable, Subscription } from "rxjs";
import { TimeOff } from "src/app/models/time-off";
import { Holiday } from "src/app/models/holiday";
import { TranslateService } from "src/app/components/translate/translate.service";
import { TimeOffService } from "../../services/time-off.service";
import { HolidayService } from "../../services/holiday.service";
import { holidayAsTimeOff, timeOffDayCountText, timeOffRecurringRangeText, timeOffScheduleText, timeOffTimeText } from "../../time-off-display";
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

  // Set when the loaded TimeOff is a materialized (active) holiday. Removed holidays have no TimeOff
  // and are shown by app-removed-holiday, not here.
  public holidayModel?: Holiday;
  public isHolidayEdited = false;
  public changedDate = false;
  public changedTime = false;

  public get isHoliday(): boolean { return this.holidayModel != null; }
  public get title(): string { return this.holidayModel?.name ?? this.timeOff?.label ?? ""; }
  public get notes(): string | undefined { return this.holidayModel?.notes ?? this.timeOff?.notes; }

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
    this.holidayModel = h;
    this.isHolidayEdited = h.isEdited;
    this.changedDate = h.date != null && h.originalDate != null && !h.date.isSame(h.originalDate, "date");
    this.changedTime = !h.isAllDay;
    const proj = holidayAsTimeOff(h);
    const tr = (k: string) => this.translateService.translate(k);
    this.schedule = timeOffScheduleText(proj, tr, this.translateService.getSelectedLanguageCode());
    this.time = timeOffTimeText(proj, tr);
    // A holiday is always a single day: no recurring span or multi-day count to show.
    this.dateRange = "";
    this.dayCount = "";
  }

  private setDatasource(id: number | undefined): void {
    this.sub?.unsubscribe();
    this.timeOff = undefined;
    this.holidayModel = undefined;
    if (id == null) return;

    this.isLoading = true;
    this.sub = this.timeOffService.get(id).subscribe(t => {
      this.timeOff = t;
      this.isLoading = false;

      // An imported holiday carries its full holiday view; applyHoliday owns all display state for it.
      if (t.holiday != null) {
        this.applyHoliday(t.holiday);
        return;
      }

      const tr = (k: string) => this.translateService.translate(k);
      this.schedule = timeOffScheduleText(t, tr, this.translateService.getSelectedLanguageCode());
      this.dateRange = timeOffRecurringRangeText(t, tr);
      this.dayCount = timeOffDayCountText(t, tr, this.translateService.getSelectedLanguageCode());
      this.time = timeOffTimeText(t, tr);
    });
  }

  public edit(): void {
    if (this.isHoliday) this.goToEditHoliday();
    else this.goToEdit();
  }

  private goToEdit(): void {
    if (this._id == null) return;
    this.router.navigate(["time-off", "edit", this._id]);
    this.onDone.next();
  }

  private goToEditHoliday(): void {
    if (this.holidayModel == null) return;
    this.router.navigate(["time-off", "holiday", "edit", this.holidayModel.id]);
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
      if (!ok || this.holidayModel == null) return;
      action(this.holidayModel.id).subscribe(() => {
        this.onChanged.next();
        this.onDone.next();
      });
    });
  }
}
