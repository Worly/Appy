import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { Appointment } from 'src/app/models/appointment';
import { CalendarDay } from 'src/app/models/calendar-day';
import { FreeTime } from 'src/app/models/free-time';
import { CalendarDayService } from 'src/app/services/calendar-day.service';
import { Tween } from 'src/app/utils/tween';

@Component({
  selector: 'app-appointments-scroller',
  templateUrl: './appointments-scroller.component.html',
  styleUrls: ['./appointments-scroller.component.scss']
})
export class AppointmentsScrollerComponent implements OnInit, OnDestroy {
  private _daysToShow: number = 1;
  @Input() set daysToShow(value: number) {
    if (this._daysToShow == value)
      return;

    this._daysToShow = value;
    this.recalculateDaysData();
  }
  get daysToShow(): number {
    return this._daysToShow;
  }

  private _date: moment.Moment = moment();
  @Input() set date(value: moment.Moment) {
    if (this.date.isSame(value, "date"))
      return;

    this._date = value;
    this.recalculateDaysData();

    this.dateChange.emit(value);
  }
  get date(): moment.Moment {
    return this._date;
  }
  @Output() dateChange: EventEmitter<moment.Moment> = new EventEmitter();

  @Input() showDateControls: boolean = false;

  private _shadowAppointments: Appointment[] = [];
  @Input() set shadowAppointments(value: Appointment[]) {
    if (this._shadowAppointments == value)
      return;

    this._shadowAppointments = value;
    this.refreshFromToTime();
  }
  get shadowAppointments(): Appointment[] {
    return this._shadowAppointments;
  }

  @Input() freeTimes: FreeTime[] | null = null;


  public daysData: DayData[] = [];

  public timeFrom: moment.Moment = moment({ hours: 8 });
  public timeTo: moment.Moment = moment({ hours: 20 });

  private timeFromTween: Tween = new Tween(() => this.timeFrom.unix(), v => this.timeFrom = moment.unix(v));
  private timeToTween: Tween = new Tween(() => this.timeTo.unix(), v => this.timeTo = moment.unix(v));

  constructor(
    private calendarDayService: CalendarDayService,
  ) {
  }

  ngOnInit(): void {
    this.recalculateDaysData();
  }

  ngOnDestroy(): void {
    for (let data of this.daysData)
      data.subscription?.unsubscribe();
  }

  recalculateDaysData() {
    if (this.daysData.filter(d => d.show).length != this.daysToShow || !this.daysData.find(d => d.show)?.date?.isSame(this.date, "date")) {
      let newDaysData: DayData[] = [];

      let firstDate = this.date;
      let lastDate = this.date.clone().add({ days: this.daysToShow - 1 });

      let numberOfCachedDates = 2;

      let beginDate = firstDate.clone().add({ days: -numberOfCachedDates });
      let endDate = lastDate.clone().add({ days: numberOfCachedDates });

      var current = beginDate.clone();

      while (current.isSameOrBefore(endDate, "date")) {
        let data = this.daysData.find(d => d.date.isSame(current, "date"));

        if (data == null) {
          data = {
            date: current.clone(),
            calendarDay: null
          };

          data.subscription = this.calendarDayService.getAll(current)
            .subscribe(c => {
              if (data != null) {
                data.calendarDay = c;
                this.refreshFromToTime();
              }
            });
        }

        data.show = current.isSameOrAfter(firstDate) && current.isSameOrBefore(lastDate);

        newDaysData.push(data);

        current = current.clone().add({ days: 1 });
      }

      // unsubscribe old data
      for (let oldData of this.daysData) {
        if (newDaysData.findIndex(d => d.date == oldData.date) == -1)
          oldData.subscription?.unsubscribe();
      }

      this.daysData = newDaysData;
    }

    this.refreshFromToTime();
  }

  refreshFromToTime() {
    let timeFrom: moment.Moment | null = null;
    let timeTo: moment.Moment | null = null;

    for (let daysData of this.daysData.filter(d => d.show)) {
      if (daysData.calendarDay == null)
        continue;

      if (daysData.calendarDay.workingHours) {
        for (let wh of daysData.calendarDay.workingHours) {
          if (wh.timeFrom == null || wh.timeTo == null)
            continue;

          if (timeFrom == null || wh.timeFrom.isBefore(timeFrom))
            timeFrom = wh.timeFrom.clone();

          if (timeTo == null || wh.timeTo.isAfter(timeTo))
            timeTo = wh.timeTo.clone();
        }

      }

      if (daysData.calendarDay.appointments) {
        for (let app of daysData.calendarDay.appointments) {
          if (app.time == null || app.duration == null)
            continue;

          if (timeFrom == null || app.time.isBefore(timeFrom))
            timeFrom = app.time.clone();

          if (timeTo == null || app.time?.clone().add(app.duration).isAfter(timeTo))
            timeTo = app.time.clone().add(app.duration);
        }
      }
    }

    for (let app of this.shadowAppointments) {
      if (app.time == null || app.duration == null)
        continue;

      if (timeFrom == null || app.time.isBefore(timeFrom))
        timeFrom = app.time.clone();

      if (timeTo == null || app.time?.clone().add(app.duration).isAfter(timeTo))
        timeTo = app.time.clone().add(app.duration);
    }

    let timeFromStamp = (timeFrom ?? moment({ hours: 8 })).unix();
    let timeToStamp = (timeTo ?? moment({ hours: 14 })).unix();

    let duration = 300;

    this.timeFromTween.tweenTo(timeFromStamp, duration);
    this.timeToTween.tweenTo(timeToStamp, duration);
  }

  getHeight(): string {
    return (this.timeTo.diff(this.timeFrom, "hours", true) / 8) * 100 + "vh";
  }

  onlyVisibleDataFilter(data: DayData): boolean {
    return data.show == true;
  }
}

type DayData = {
  date: moment.Moment;
  calendarDay: CalendarDay | null;
  show?: boolean;
  subscription?: Subscription;
}