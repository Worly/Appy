import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateService } from 'src/app/components/translate/translate.service';
import dayjs, { Dayjs } from 'dayjs';
import { Subscription } from 'rxjs';
import { DayOfWeek } from 'src/app/models/working-hours';
import { TimeOff, TimeOffRecurrence } from 'src/app/models/time-off';
import { TimeOffService } from '../../services/time-off.service';

@Component({
  selector: 'app-time-off-edit',
  templateUrl: './time-off-edit.component.html',
  styleUrls: ['./time-off-edit.component.scss']
})
export class TimeOffEditComponent implements OnInit, OnDestroy {
  public timeOff: TimeOff = new TimeOff();
  public isNew: boolean = true;
  public isLoading: boolean = false;

  public readonly TimeOffRecurrence = TimeOffRecurrence;

  public readonly recurrenceItems: TimeOffRecurrence[] = [
    TimeOffRecurrence.OneOff,
    TimeOffRecurrence.Weekly,
    TimeOffRecurrence.Monthly,
  ];

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

  private static readonly RECURRENCE_KEYS: Record<TimeOffRecurrence, string> = {
    [TimeOffRecurrence.OneOff]: "pages.time-off.ONE_OFF",
    [TimeOffRecurrence.Weekly]: "pages.time-off.WEEKLY",
    [TimeOffRecurrence.Monthly]: "pages.time-off.MONTHLY",
  };

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
        // Ensure date fields have a fallback so app-date-selector never gets null
        if (!t.startDate) t.startDate = dayjs();
        if (!t.endDate) t.endDate = dayjs();
        if (!t.timeFrom) t.timeFrom = dayjs({ hour: 9 });
        if (!t.timeTo) t.timeTo = dayjs({ hour: 17 });
        this.timeOff = t;
      }));
    } else {
      this.timeOff = new TimeOff();
      this.timeOff.startDate = dayjs();
      this.timeOff.endDate = dayjs();
      this.timeOff.timeFrom = dayjs({ hour: 9 });
      this.timeOff.timeTo = dayjs({ hour: 17 });
    }
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // displayFunction for recurrence dropdown
  public formatRecurrence = (recurrence: TimeOffRecurrence): string => {
    const key = TimeOffEditComponent.RECURRENCE_KEYS[recurrence];
    return this.translateService.translate(key);
  };

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

  public onStartDateChange(date: Dayjs): void {
    this.timeOff.startDate = date;
  }

  public onEndDateChange(date: Dayjs): void {
    this.timeOff.endDate = date;
  }

  public save(): void {
    if (!this.timeOff.validate()) return;

    this.isLoading = true;
    const obs = this.isNew
      ? this.timeOffService.addNew(this.timeOff)
      : this.timeOffService.save(this.timeOff);

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
