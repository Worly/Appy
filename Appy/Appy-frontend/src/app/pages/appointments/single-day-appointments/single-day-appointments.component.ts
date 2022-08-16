import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Subscription } from 'rxjs';
import { CalendarTodayHeaderComponent } from 'src/app/components/calendar-today-header/calendar-today-header.component';
import { Appointment } from 'src/app/models/appointment';
import { FreeTime } from 'src/app/models/free-time';
import { ServiceColorsService } from 'src/app/services/service-colors.service';
import moment from "moment/moment";
import { Moment, Duration, duration } from "moment";
import { invertTimesCustom } from 'src/app/utils/invert-times';
import { WorkingHour } from 'src/app/models/working-hours';

@Component({
  selector: 'app-single-day-appointments',
  templateUrl: './single-day-appointments.component.html',
  styleUrls: ['./single-day-appointments.component.scss']
})
export class SingleDayAppointmentsComponent implements OnInit, OnDestroy {

  private _appointments: Appointment[] | null = null;
  @Input() set appointments(value: Appointment[] | null) {
    if (this._appointments == value)
      return;

    this._appointments = value;
    this.renderAppointments();
  }
  public get appointments(): Appointment[] | null {
    return this._appointments;
  }

  private _date: Moment | null = null;
  @Input() set date(value: Moment | null) {
    if (this._date == value)
      return;

    this._date = value;
  }
  public get date(): Moment | null {
    return this._date;
  }

  private _workingHours: WorkingHour[] | null = null;
  @Input() set workingHours(value: WorkingHour[] | null) {
    if (this._workingHours == value)
      return;

    this._workingHours = value;
    this.renderTimeStatuses();
  }
  public get workingHours(): WorkingHour[] | null {
    return this._workingHours;
  }

  private _timeFrom: Moment = moment({ hours: 0 });
  @Input() set timeFrom(value: Moment) {
    if (this._timeFrom.isSame(value))
      return;

    this._timeFrom = value;
    this.render();
  }
  get timeFrom(): Moment {
    return this._timeFrom;
  }

  private _timeTo: Moment = moment({ hours: 23, minutes: 59 });
  @Input() set timeTo(value: Moment) {
    if (this._timeTo.isSame(value))
      return;

    this._timeTo = value;
    this.render();
  }
  get timeTo(): Moment {
    return this._timeTo;
  }

  private _shadowAppointments: Appointment[] = [];
  @Input() set shadowAppointments(value: Appointment[]) {
    if (this._shadowAppointments == value)
      return;

    this._shadowAppointments = value;
    this.renderShadowAppointments();
  }
  get shadowAppointments(): Appointment[] {
    return this._shadowAppointments;
  }

  private _freeTimes: FreeTime[] | null = null;
  @Input() set freeTimes(value: FreeTime[] | null) {
    if (this._freeTimes == value)
      return;

    this._freeTimes = value;
    this.renderTimeStatuses();
  }
  get freeTimes(): FreeTime[] | null {
    return this._freeTimes;
  }

  @Input() showDateControls: boolean = false;
  @Output() dateControlPrevious: EventEmitter<void> = new EventEmitter();
  @Output() dateControlNext: EventEmitter<void> = new EventEmitter();
  @Output() dateControlSelect: EventEmitter<Moment> = new EventEmitter();

  calendarTodayHeaderComponent = CalendarTodayHeaderComponent;

  public currentTimeIndicatorTop: number = 0;
  public renderedAppointments: RenderedAppointment[] = [];
  public renderedShadowAppointments: RenderedAppointment[] = [];
  public renderedTimeStatuses: RenderedTimeStatus[] = [];

  private subs: Subscription[] = [];
  private interval: any;

  constructor(
    public serviceColorsService: ServiceColorsService
  ) { }

  ngOnInit(): void {
    this.interval = setInterval(() => this.renderCurrentTimeIndicator(), 10000);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    clearInterval(this.interval)
  }

  public render(): void {
    this.renderCurrentTimeIndicator();
    this.renderAppointments();
    this.renderShadowAppointments();
    this.renderTimeStatuses();
  }

  public renderAppointments(): void {
    this.renderedAppointments = [];
    if (this.appointments) {
      for (let ap of this.appointments) {
        let ra = this.getRenderedAppointment(ap);

        if (ra)
          this.renderedAppointments.push(ra);
      }
    }
  }

  public renderShadowAppointments(): void {
    this.renderedShadowAppointments = [];
    for (let ap of this.shadowAppointments) {
      let ra = this.getRenderedAppointment(ap);

      if (ra)
        this.renderedShadowAppointments.push(ra);
    }
  }

  public renderTimeStatuses(): void {
    this.renderedTimeStatuses = [];

    if (this.freeTimes != null) {
      for (let freeTime of this.freeTimes) {
        let rts: RenderedTimeStatus = {
          top: this.getTopPercentage(freeTime.from),
          height: this.getHeightPercentage(duration(freeTime.toIncludingDuration.diff(freeTime.from))),
          status: "free-time"
        };

        this.cropRenderedItem(rts);
        this.renderedTimeStatuses.push(rts);
      }

      let takenTimes = invertTimesCustom(this.freeTimes, t => t.from, t => t.toIncludingDuration, this.timeFrom, this.timeTo);
      for (let takenTime of takenTimes) {
        let rts: RenderedTimeStatus = {
          top: this.getTopPercentage(takenTime.from),
          height: this.getHeightPercentage(duration(takenTime.to.diff(takenTime.from))),
          status: "taken-time"
        };

        this.cropRenderedItem(rts);
        this.renderedTimeStatuses.push(rts);
      }
    }

    if (this.workingHours != null) {
      let closedTimes = invertTimesCustom(this.workingHours, t => t.timeFrom as Moment, t => t.timeTo as Moment, this.timeFrom, this.timeTo);
      for (let closedTime of closedTimes) {
        let rts: RenderedTimeStatus = {
          top: this.getTopPercentage(closedTime.from),
          height: this.getHeightPercentage(duration(closedTime.to.diff(closedTime.from))),
          status: "closed-time"
        };

        this.cropRenderedItem(rts);
        this.renderedTimeStatuses.push(rts);
      }
    }
  }

  public renderCurrentTimeIndicator(): void {
    this.currentTimeIndicatorTop = (moment().diff(this.timeFrom) / this.timeTo.diff(this.timeFrom)) * 100;
  }

  private getRenderedAppointment(ap: Appointment): RenderedAppointment | null {
    if (ap.time == null || ap.duration == null || ap.service == null)
      return null;

    if (!ap.date?.isSame(this.date, "date"))
      return null;

    let ra: RenderedAppointment = {
      top: this.getTopPercentage(ap.time),
      height: this.getHeightPercentage(ap.duration),
      color: this.serviceColorsService.get(ap.service?.colorId),
      time: `${ap.time.format("HH:mm")} - ${ap.time.clone().add(ap.duration).format("HH:mm")}`,
      serviceName: ap.service.name as string
    };

    if (ra.top < 0 || ra.top >= 100)
      return null;

    if (ra.top + ra.height > 100)
      ra.height = 100 - ra.top;

    return ra;
  }

  private getTopPercentage(time: Moment): number {
    return (time.diff(this.timeFrom) / this.timeTo.diff(this.timeFrom)) * 100
  }

  private getHeightPercentage(duration: Duration): number {
    return (duration.asMilliseconds() / this.timeTo.diff(this.timeFrom)) * 100;
  }

  private cropRenderedItem(item: { top: number, height: number }) {
    if (item.top < 0) {
      item.height += item.top;
      item.top = 0;
    }

    if (item.height < 0)
      item.height = 0;

    if (item.top + item.height > 100)
      item.height = 100 - item.top;
  }

  // returns arrays of numbers where each number represents a cell in table which shows hours
  // each number is from <0 to 1] where it represents percentage of table height
  public getHoursToRender(): { hour: string, heightPercentage: number }[] {
    if (this.timeFrom.hours() == this.timeTo.hours())
      return [{ hour: this.timeFrom.format("H:mm"), heightPercentage: 1 }];

    let hours = [];

    let current = this.timeFrom.hours();

    hours.push({ hour: this.timeFrom.format("H:mm"), heightPercentage: (60 - this.timeFrom.minutes()) / 60 });
    current++;

    while (current < this.timeTo.hours()) {
      hours.push({ hour: current + ":00", heightPercentage: 1 });
      current++;
    }

    if (this.timeTo.minutes() > 0)
      hours.push({ hour: this.timeTo.hours() + ":00", heightPercentage: this.timeTo.minutes() / 60 });

    return hours.map(h => { return { hour: h.hour, heightPercentage: h.heightPercentage / hours.length } });
  }

  public getNowDate(): Moment {
    return moment();
  }
}

type RenderedAppointment = {
  top: number;
  height: number;
  color: string;
  time: string;
  serviceName: string;
}

type RenderedTimeStatus = {
  top: number;
  height: number;
  status: string;
}