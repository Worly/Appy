import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import dayjs, { Dayjs, unix } from 'dayjs';
import _ from 'lodash';
import { Subscription } from 'rxjs';
import { Appointment } from 'src/app/models/appointment';
import { CalendarDay } from 'src/app/models/calendar-day';
import { FreeTime } from 'src/app/models/free-time';
import { Data, DateSmartCaching } from 'src/app/utils/smart-caching';
import { Tween, TweenManager } from 'src/app/utils/tween';
import { CalendarDayService } from '../../services/calendar-day.service';
import { appFilterToSmartFilter, AppointmentsFilter } from '../appointments/appointments.component';

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
    this.calendarDaySmartCaching.showCount = this._daysToShow;
    this.load();
  }
  get daysToShow(): number {
    return this._daysToShow;
  }

  private _date: Dayjs = dayjs();
  @Input() set date(value: Dayjs) {
    if (this.date.isSame(value, "date"))
      return;

    this._date = value;
    this.load();

    this.dateChange.emit(value);
  }
  get date(): Dayjs {
    return this._date;
  }
  @Output() dateChange: EventEmitter<Dayjs> = new EventEmitter();

  private _filter: AppointmentsFilter = {};
  @Input() set filter(value: AppointmentsFilter) {
    if (_.isEqual(this._filter, value))
      return;

    this._filter = value;
    this.reload();
  }

  @Input() showDateControls: boolean = false;
  @Input() appointmentsEditable: boolean = true;
  @Input() hiddenAppointmentIds?: number[]

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

  @Output() onCalendarClick: EventEmitter<Dayjs> = new EventEmitter();

  public calendarDaySmartCaching: DateSmartCaching<CalendarDay>
    = new DateSmartCaching(d => this.calendarDayService.getAll(d, appFilterToSmartFilter(this._filter)), this.daysToShow);

  public timeFrom: Dayjs = dayjs({ hours: 8 });
  public timeTo: Dayjs = dayjs({ hours: 20 });

  private timeTweenManager: TweenManager = new TweenManager();
  private timeFromTween: Tween = new Tween(() => this.timeFrom.unix(), v => this.timeFrom = unix(v), this.timeTweenManager);
  private timeToTween: Tween = new Tween(() => this.timeTo.unix(), v => this.timeTo = unix(v), this.timeTweenManager);

  private subs: Subscription[] = [];

  constructor(
    private calendarDayService: CalendarDayService,
  ) {
  }

  ngOnInit(): void {
    this.subs.push(this.calendarDaySmartCaching.onDataLoaded.subscribe(d => {
      this.refreshFromToTime();
    }));

    this.load();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());

    this.calendarDaySmartCaching.dispose();
  }

  reload() {
    this.calendarDaySmartCaching.reloadAll();
    this.refreshFromToTime();
  }

  load() {
    this.calendarDaySmartCaching.load(this.date);
    this.refreshFromToTime();
  }

  refreshFromToTime() {
    let timeFrom: Dayjs | null = null;
    let timeTo: Dayjs | null = null;

    for (let daysData of this.calendarDaySmartCaching.data.filter(d => d.show)) {
      if (daysData.data == null)
        continue;

      if (daysData.data.workingHours) {
        for (let wh of daysData.data.workingHours) {
          if (wh.timeFrom == null || wh.timeTo == null)
            continue;

          if (timeFrom == null || wh.timeFrom.isBefore(timeFrom))
            timeFrom = wh.timeFrom;

          if (timeTo == null || wh.timeTo.isAfter(timeTo))
            timeTo = wh.timeTo;
        }

      }

      if (daysData.data.appointments) {
        for (let app of daysData.data.appointments.filter(a => this.notInHiddenFilter(a))) {
          if (app.time == null || app.duration == null)
            continue;

          if (timeFrom == null || app.time.isBefore(timeFrom))
            timeFrom = app.time;

          if (timeTo == null || app.time?.add(app.duration).isAfter(timeTo))
            timeTo = app.time.add(app.duration);
        }
      }
    }

    for (let app of this.shadowAppointments) {
      if (app.time == null || app.duration == null)
        continue;

      if (timeFrom == null || app.time.isBefore(timeFrom))
        timeFrom = app.time;

      if (timeTo == null || app.time?.add(app.duration).isAfter(timeTo))
        timeTo = app.time.add(app.duration);
    }

    let timeFromStamp = (timeFrom ?? dayjs({ hours: 8 })).unix();
    let timeToStamp = (timeTo ?? dayjs({ hours: 14 })).unix();

    let duration = 300;
    this.timeFromTween.tweenTo(timeFromStamp, duration);
    this.timeToTween.tweenTo(timeToStamp, duration);
    // this.timeFrom = dayjs.unix(timeFromStamp);
    // this.timeTo = dayjs.unix(timeToStamp);
  }

  getHeight(): string {
    return (this.timeTo.diff(this.timeFrom, "hours", true) / 8) * 100 + "vh";
  }

  onlyVisibleDataFilter(data: Data<Dayjs, CalendarDay>): boolean {
    return data.show == true;
  }

  notInHiddenFilter(ap: Appointment): boolean {
    return this.hiddenAppointmentIds == null || !this.hiddenAppointmentIds.includes(ap.id);
  }

  calendarClicked(time: Dayjs) {
    this.onCalendarClick.next(time);
  }
}