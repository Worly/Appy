import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from 'src/app/components/translate/translate.service';
import dayjs, { Dayjs } from 'dayjs';
import { Subscription } from 'rxjs';
import { DayOfWeek } from 'src/app/models/working-hours';
import { TimeOff, TimeOffRecurrence } from 'src/app/models/time-off';
import { TimeOffService } from '../../services/time-off.service';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';

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

  @ViewChild("splitDialog") splitDialog?: DialogComponent;

  // Split prompt state for recurring edits: "date" forks the timeline at `splitDate`,
  // "all" applies the change to the whole rule (no fork). Default date is today.
  public splitMode: "date" | "all" = "date";
  public splitDate: Dayjs = dayjs();

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
  public readonly minutes: number[] = [0, 15, 30, 45];

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

        this.type = t.recurrence === TimeOffRecurrence.OneOff ? "oneoff" : "recurring";
        this.timeOff = t;
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
      // Default the end date when the toggle is first enabled.
      if (!this.timeOff.endDate) this.timeOff.endDate = dayjs();
    } else {
      // Drop only the end bound — the effective-from (startDate) is always kept.
      this.timeOff.endDate = undefined;
    }
  }

  public onStartDateChange(date: Dayjs): void {
    this.timeOff.startDate = date;
  }

  public onEndDateChange(date: Dayjs): void {
    this.timeOff.endDate = date;
  }

  public save(): void {
    if (!this.timeOff.validate()) return;

    // Recurring edits fork the rule's timeline — ask the user from which date the change applies.
    if (!this.isNew && this.type === "recurring") {
      this.splitMode = "date";
      this.splitDate = dayjs();
      this.splitDialog?.open();
      return;
    }

    this.commit();
  }

  public confirmSplit(): void {
    if (this.splitMode === "date") {
      // A fork only happens when the split date is strictly after the rule's current start
      // (mirrors the backend's condition). Only then does the split date become the new segment's
      // start — so only then do we move startDate and validate it against the "until". When the
      // date is on/before the current start there is no history to preserve: the backend does a
      // plain in-place edit, and mutating startDate here would silently move the rule's start to
      // the split date (e.g. accepting the default "today" on a future-dated rule).
      const forks = this.timeOff.startDate == null || this.splitDate.isAfter(this.timeOff.startDate, "date");
      if (forks) {
        this.timeOff.startDate = this.splitDate;
        if (!this.timeOff.validate()) {
          this.splitDialog?.close(); // surface the form error (e.g. split date after the "until")
          return;
        }
        this.splitDialog?.close();
        this.commit(this.splitDate);
      } else {
        // No fork → plain in-place edit; leave startDate untouched and send no applyFrom.
        this.splitDialog?.close();
        this.commit();
      }
    } else {
      // "Entire schedule" → plain in-place edit, no fork.
      this.splitDialog?.close();
      this.commit();
    }
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
