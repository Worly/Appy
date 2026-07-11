import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from 'src/app/components/translate/translate.service';
import dayjs, { Dayjs } from 'dayjs';
import { Subscription } from 'rxjs';
import { DayOfWeek } from 'src/app/models/working-hours';
import { TimeOff, TimeOffRecurrence } from 'src/app/models/time-off';
import { TimeOffService } from '../../services/time-off.service';
import { HolidayService } from '../../services/holiday.service';
import { canStopRecurring, timeOffDayCountText } from '../../time-off-display';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
import { SegmentedOption } from 'src/app/components/segmented-control/segmented-control.component';

@Component({
  selector: 'app-time-off-edit',
  templateUrl: './time-off-edit.component.html',
  styleUrls: ['./time-off-edit.component.scss']
})
export class TimeOffEditComponent implements OnInit, OnDestroy {
  public timeOff: TimeOff = new TimeOff();
  public isNew: boolean = true;
  public isLoading: boolean = false;
  // Gates the form: editing fetches the rule async, so we must not render the
  // date-selectors (which require a defined Dayjs) until the model is populated.
  public isLoaded: boolean = false;
  // Recurring rules always carry an effective-from (startDate); this toggle controls only whether
  // they also have an end ("until") date. It never clears the start.
  public hasEndDate: boolean = false;

  // A holiday-linked time-off edits in "holiday mode": read-only label, single date, no recurrence
  // or fork dialog, saved/removed via HolidayService. Derived from the loaded TimeOff's embedded holiday.
  public isHolidayMode: boolean = false;

  @ViewChild("splitDialog") splitDialog?: DialogComponent;
  @ViewChild("deleteDialog") deleteDialog?: DialogComponent;

  // Split prompt state for recurring edits: "date" forks the timeline at `splitDate`,
  // "all" applies the change to the whole rule (no fork). Default date is today.
  public splitMode: "date" | "all" = "date";
  public splitDate: Dayjs = dayjs();

  // The rule's start date as loaded (after defaulting). A recurring edit forks the timeline only
  // when the start date is unchanged; moving it is direct timeline editing → save in place. See save().
  private originalStartDate?: Dayjs;

  // Delete prompt state for recurring rules: "stop" clamps the rule's end to yesterday (keeps
  // history), "remove" hard-deletes the row. The stop-vs-remove choice is only offered when
  // `canStop` is true; otherwise the dialog is a plain "are you sure" confirmation.
  public deleteMode: "stop" | "remove" = "stop";
  // Whether the rule being deleted can be stopped (kept as history) rather than hard-deleted —
  // drives whether the delete dialog shows the stop-vs-remove choice or a plain confirmation.
  public canStop: boolean = false;

  public readonly deleteModeOptions: SegmentedOption[] = [
    { value: "stop", label: "pages.time-off.DELETE_MODE_STOP", dataTest: "time-off-delete-stop" },
    { value: "remove", label: "pages.time-off.DELETE_MODE_REMOVE", dataTest: "time-off-delete-remove" },
  ];

  public readonly TimeOffRecurrence = TimeOffRecurrence;

  public type: "oneoff" | "recurring" = "oneoff";

  public readonly daysOfWeek: DayOfWeek[] = [
    DayOfWeek.Monday,
    DayOfWeek.Tuesday,
    DayOfWeek.Wednesday,
    DayOfWeek.Thursday,
    DayOfWeek.Friday,
    DayOfWeek.Saturday,
    DayOfWeek.Sunday,
  ];

  public readonly daysOfMonth: number[] = Array.from({ length: 31 }, (_, i) => i + 1);
  public readonly hours: number[] = Array.from({ length: 25 }, (_, i) => i);
  public readonly minutes: number[] = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  public readonly recurrenceOptions: SegmentedOption[] = [
    { value: TimeOffRecurrence.Weekly, label: "pages.time-off.WEEKLY", dataTest: "time-off-recurrence-weekly" },
    { value: TimeOffRecurrence.Monthly, label: "pages.time-off.MONTHLY", dataTest: "time-off-recurrence-monthly" },
  ];

  public readonly splitModeOptions: SegmentedOption[] = [
    { value: "date", label: "pages.time-off.APPLY_FROM_SPECIFIC", dataTest: "time-off-split-from-date" },
    { value: "all", label: "pages.time-off.APPLY_FROM_ALL", dataTest: "time-off-split-all" },
  ];

  private static readonly DAY_OF_WEEK_KEYS: Record<DayOfWeek, string> = {
    [DayOfWeek.Sunday]: "SUNDAY",
    [DayOfWeek.Monday]: "MONDAY",
    [DayOfWeek.Tuesday]: "TUESDAY",
    [DayOfWeek.Wednesday]: "WEDNESDAY",
    [DayOfWeek.Thursday]: "THURSDAY",
    [DayOfWeek.Friday]: "FRIDAY",
    [DayOfWeek.Saturday]: "SATURDAY",
  };

  private subs: Subscription[] = [];

  constructor(
    private timeOffService: TimeOffService,
    private route: ActivatedRoute,
    private location: Location,
    private translateService: TranslateService,
    private holidayService: HolidayService,
  ) { }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (id != null) {
      this.isNew = false;
      this.subs.push(this.timeOffService.get(+id).subscribe(t => {
        if (!t.timeFrom) t.timeFrom = dayjs({ hour: 9 });
        if (!t.timeTo) t.timeTo = dayjs({ hour: 17 });

        if (t.recurrence === TimeOffRecurrence.OneOff) {
          if (!t.startDate) t.startDate = dayjs();
          if (!t.endDate) t.endDate = dayjs();
        } else {
          // Recurring rules always carry an effective-from; default a missing one to today so the
          // always-shown From selector has a value. The optional end date drives the toggle.
          if (!t.startDate) t.startDate = dayjs();
          this.hasEndDate = t.endDate != null;
        }

        // A time-off carrying an embedded holiday edits in holiday mode.
        this.isHolidayMode = t.holiday != null;
        this.type = t.recurrence === TimeOffRecurrence.OneOff ? "oneoff" : "recurring";
        this.timeOff = t;
        this.originalStartDate = t.startDate;
        this.isLoaded = true;
      }));
    } else {
      this.timeOff = new TimeOff();
      const typeParam = this.route.snapshot.queryParamMap.get("type");
      this.type = typeParam === "recurring" ? "recurring" : "oneoff";

      if (this.type === "oneoff") {
        this.timeOff.recurrence = TimeOffRecurrence.OneOff;
        this.timeOff.startDate = dayjs();
        this.timeOff.endDate = dayjs();
      } else {
        this.timeOff.recurrence = TimeOffRecurrence.Weekly;
        this.timeOff.dayOfWeek = DayOfWeek.Monday;
        this.timeOff.startDate = dayjs(); // effective-from defaults to today; the end date is opt-in
      }
      // New time-offs default to all-day; the 9–17 time range is pre-filled so it's ready the
      // moment the user turns all-day off.
      this.timeOff.isAllDay = true;
      this.timeOff.timeFrom = dayjs({ hour: 9 });
      this.timeOff.timeTo = dayjs({ hour: 17 });
      this.isLoaded = true;
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // displayFunction for day-of-week dropdown
  public formatDayOfWeek = (dayOfWeek: DayOfWeek): string => {
    const key = TimeOffEditComponent.DAY_OF_WEEK_KEYS[dayOfWeek];
    return this.translateService.translate(key);
  };

  // displayFunction for hour/minute dropdowns (mirrors working-hours pattern)
  public formatHourMinute(hourMinute: number): string {
    return hourMinute.toString().padStart(2, "0");
  }

  public setFromHour(h: number): void {
    this.timeOff.timeFrom = (this.timeOff.timeFrom ?? dayjs({ hour: 0 })).hour(h);
  }

  public setFromMinute(m: number): void {
    this.timeOff.timeFrom = (this.timeOff.timeFrom ?? dayjs({ hour: 0 })).minute(m);
  }

  public setToHour(h: number): void {
    this.timeOff.timeTo = (this.timeOff.timeTo ?? dayjs({ hour: 0 })).hour(h);
  }

  public setToMinute(m: number): void {
    this.timeOff.timeTo = (this.timeOff.timeTo ?? dayjs({ hour: 0 })).minute(m);
  }

  public setRecurrence(recurrence: TimeOffRecurrence): void {
    this.timeOff.recurrence = recurrence;
    if (recurrence === TimeOffRecurrence.Weekly) {
      this.timeOff.dayOfMonth = undefined;
      if (this.timeOff.dayOfWeek == null) this.timeOff.dayOfWeek = DayOfWeek.Monday;
    } else {
      this.timeOff.dayOfWeek = undefined;
      if (this.timeOff.dayOfMonth == null) this.timeOff.dayOfMonth = 1;
    }
  }

  public onHasEndDateChange(value: boolean): void {
    this.hasEndDate = value;
    if (value) {
      // Default the end date to the effective-from when the toggle is first enabled.
      if (!this.timeOff.endDate) this.timeOff.endDate = this.timeOff.startDate ?? dayjs();
    } else {
      // Drop only the end bound — the effective-from (startDate) is always kept.
      this.timeOff.endDate = undefined;
    }
  }

  // Live, inclusive "N days" caption for the one-off date range (re-evaluated on every date change).
  public get oneOffDayCountText(): string {
    return timeOffDayCountText(
      this.timeOff,
      (k) => this.translateService.translate(k),
      this.translateService.getSelectedLanguageCode(),
    );
  }

  public onStartDateChange(date: Dayjs): void {
    const previousStart = this.timeOff.startDate;
    this.timeOff.startDate = date;

    // When the range was a single day (To == the old From), keep them linked by dragging the To date
    // along with the From. A multi-day range — or no end date at all — leaves its To untouched.
    if (previousStart != null && this.timeOff.endDate != null
      && this.timeOff.endDate.isSame(previousStart, "date")) {
      this.timeOff.endDate = date;
    }
  }

  public onEndDateChange(date: Dayjs): void {
    this.timeOff.endDate = date;
  }

  public save(): void {
    if (this.isHolidayMode) {
      if (!this.timeOff.validate()) return;
      this.isLoading = true;
      this.subs.push(this.holidayService.edit(this.timeOff.holiday!.id, {
        date: this.timeOff.startDate!.format("YYYY-MM-DD"),
        isAllDay: this.timeOff.isAllDay,
        timeFrom: this.timeOff.isAllDay ? undefined : this.timeOff.timeFrom?.format("HH:mm:ss"),
        timeTo: this.timeOff.isAllDay ? undefined : this.timeOff.timeTo?.format("HH:mm:ss"),
        notes: this.timeOff.notes,
      }).subscribe({ next: () => this.goBack(), error: () => { this.isLoading = false; } }));
      return;
    }

    if (!this.timeOff.validate()) return;

    // A recurring edit can fork the rule's timeline — but only when the user changed the rule's
    // content (day/time/all-day), NOT its start date. Moving the start date IS editing the timeline
    // directly, so there's nothing to fork: save it in place. Gating on the start date also avoids
    // the trap where the fork dialog's date silently overrode the start the user just set.
    if (!this.isNew && this.type === "recurring") {
      const startMoved = !this.timeOff.startDate?.isSame(this.originalStartDate, "date");
      if (!startMoved) {
        this.splitMode = "date";
        this.splitDate = dayjs();
        this.splitDialog?.open();
        return;
      }
      // start date moved → plain in-place edit (no applyFrom, no dialog); fall through to commit().
    }

    this.commit();
  }

  public confirmSplit(): void {
    this.splitDialog?.close();

    // "Entire schedule", or a split date on/before the current start, is a plain in-place edit: there
    // is no history to preserve, and mutating startDate would silently move the rule's start to the
    // split date (e.g. accepting the default "today" on a future-dated rule). Leave startDate untouched
    // and send no applyFrom.
    const forks = this.splitMode === "date"
      && this.splitDate.isAfter(this.timeOff.startDate, "date");
    if (!forks) {
      this.commit();
      return;
    }

    // A fork: the split date becomes the new segment's start, so move startDate and validate it
    // against the "until" before committing.
    this.timeOff.startDate = this.splitDate;
    if (!this.timeOff.validate()) // surface the form error (e.g. split date after the "until")
      return;
    this.commit(this.splitDate);
  }

  public onSplitDateChange(date: Dayjs): void {
    this.splitDate = date;
  }

  private commit(applyFrom?: Dayjs): void {
    this.isLoading = true;
    const obs = this.isNew
      ? this.timeOffService.addNew(this.timeOff)
      : this.timeOffService.saveWithSplit(this.timeOff, applyFrom);

    this.subs.push(obs.subscribe({
      next: () => this.goBack(),
      error: () => { this.isLoading = false; }
    }));
  }

  public delete(): void {
    if (this.isNew) return;

    if (this.isHolidayMode) {
      this.canStop = false;
      this.deleteMode = "remove";
      this.deleteDialog?.open();
      return;
    }

    // Every delete goes through a confirmation dialog. For an active, already-started recurring
    // rule it also offers "stop" (keep history) vs full delete; otherwise it's a plain confirm.
    this.canStop = canStopRecurring(this.timeOff, dayjs());
    this.deleteMode = "stop";
    this.deleteDialog?.open();
  }

  public confirmDelete(): void {
    this.deleteDialog?.close();
    if (this.isHolidayMode) {
      this.isLoading = true;
      this.subs.push(this.holidayService.remove(this.timeOff.holiday!.id).subscribe({ next: () => this.goBack(), error: () => { this.isLoading = false; } }));
      return;
    }
    if (this.canStop && this.deleteMode === "stop") this.stop();
    else this.deleteNow();
  }

  private stop(): void {
    this.isLoading = true;
    this.subs.push(this.timeOffService.stop(this.timeOff.id).subscribe({
      next: () => this.goBack(),
      error: () => { this.isLoading = false; }
    }));
  }

  private deleteNow(): void {
    this.isLoading = true;
    this.subs.push(this.timeOffService.delete(this.timeOff.id).subscribe({
      next: () => this.goBack(),
      error: () => { this.isLoading = false; }
    }));
  }

  public goBack(): void {
    this.location.back();
  }
}
