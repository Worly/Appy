import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { DateAdapter, MatDateFormats, MAT_DATE_FORMATS } from '@angular/material/core';
import { DateRange, MatCalendar } from '@angular/material/datepicker';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-calendar-today-header',
  templateUrl: './calendar-today-header.component.html',
  styleUrls: ['./calendar-today-header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CalendarTodayHeaderComponent<D> implements OnDestroy {
  private _destroyed = new Subject<void>();

  constructor(
    private _calendar: MatCalendar<D>,
    private _dateAdapter: DateAdapter<D>,
    @Inject(MAT_DATE_FORMATS) private _dateFormats: MatDateFormats,
    cdr: ChangeDetectorRef,
  ) {
    _calendar.stateChanges.pipe(takeUntil(this._destroyed)).subscribe(() => cdr.markForCheck());
  }

  ngOnDestroy() {
    this._destroyed.next();
    this._destroyed.complete();
  }

  get periodLabel() {
    let label: any;

    if (this._calendar.currentView == "month")
      label = this._dateFormats.display.monthYearLabel;
    else if (this._calendar.currentView == "year")
      label = "YYYY";

    return this._dateAdapter
      .format(this._calendar.activeDate, label)
      .toLocaleUpperCase();
  }

  periodLabelClick() {
    if (this._calendar.currentView == "month")
      this._calendar.currentView = "year";
    else
      this._calendar.currentView = "month";
  }

  todayClick(event: Event) {
    this._calendar.activeDate = this._dateAdapter.today();
    this._calendar._dateSelected({
      value: this._calendar.activeDate,
      event: event
    });
  }

  previousClick() {
    if (this._calendar.currentView == "month")
      this._calendar.activeDate = this._dateAdapter.addCalendarMonths(this._calendar.activeDate, -1);
    else if (this._calendar.currentView == "year")
      this._calendar.activeDate = this._dateAdapter.addCalendarYears(this._calendar.activeDate, -1);
  }

  nextClick() {
    if (this._calendar.currentView == "month")
      this._calendar.activeDate = this._dateAdapter.addCalendarMonths(this._calendar.activeDate, 1);
    else if (this._calendar.currentView == "year")
      this._calendar.activeDate = this._dateAdapter.addCalendarYears(this._calendar.activeDate, 1);
  }

  isTodaySelected(): boolean {
    if (this._calendar.selected == null || this._calendar.selected instanceof DateRange)
      return false;

    return this._dateAdapter.sameDate(this._calendar.selected, this._dateAdapter.today());
  }
}
