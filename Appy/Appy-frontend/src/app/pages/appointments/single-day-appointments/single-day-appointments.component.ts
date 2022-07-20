import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { Appointment } from 'src/app/models/appointment';
import { AppointmentService } from 'src/app/services/appointment.service.ts';
import { ServiceColorsService } from 'src/app/services/service-colors.service';

@Component({
  selector: 'app-single-day-appointments',
  templateUrl: './single-day-appointments.component.html',
  styleUrls: ['./single-day-appointments.component.scss']
})
export class SingleDayAppointmentsComponent implements OnInit, OnDestroy {

  private _data?: SingleDayAppointmentsData;
  @Input() set data(value: SingleDayAppointmentsData | undefined) {
    if (this._data == value)
      return;

    this._data = value;
    this.render();
  }
  public get data(): SingleDayAppointmentsData | undefined {
    return this._data;
  }

  private _timeFrom: moment.Moment = moment({ hours: 0 });
  @Input() set timeFrom(value: moment.Moment) {
    if (this._timeFrom.isSame(value))
      return;

    this._timeFrom = value;
    this.render();
  }
  get timeFrom(): moment.Moment {
    return this._timeFrom;
  }

  private _timeTo: moment.Moment = moment({ hours: 23, minutes: 59 });
  @Input() set timeTo(value: moment.Moment) {
    if (this._timeTo.isSame(value))
      return;

    this._timeTo = value;
    this.render();
  }
  get timeTo(): moment.Moment {
    return this._timeTo;
  }

  public currentTimeIndicatorTop: number = 0;
  public renderedAppointments: RenderedAppointment[] = [];

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

    this.renderedAppointments = [];
    if (this.data?.appointments) {
      for (let ap of this.data?.appointments) {
        if (ap.time == null || ap.duration == null || ap.service == null)
          return;

        let ra: RenderedAppointment = {
          top: (ap.time.diff(this.timeFrom) / this.timeTo.diff(this.timeFrom)) * 100,
          height: (ap.duration.asMilliseconds() / this.timeTo.diff(this.timeFrom)) * 100,
          color: this.serviceColorsService.get(ap.service?.colorId),
          time: `${ap.time.format("HH:mm")} - ${ap.time.clone().add(ap.duration).format("HH:mm")}`,
          serviceName: ap.service.name as string
        };

        if (ra.top < 0 || ra.top >= 100)
          continue;

        if (ra.top + ra.height > 100)
          ra.height = 100 - ra.top;

        this.renderedAppointments.push(ra);
      }

    }
  }

  public renderCurrentTimeIndicator(): void {
    this.currentTimeIndicatorTop = (moment().diff(this.timeFrom) / this.timeTo.diff(this.timeFrom)) * 100;
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

  public getNowDate(): moment.Moment {
    return moment();
  }
}

export type SingleDayAppointmentsData = {
  date: moment.Moment;
  appointments: Appointment[];
}

type RenderedAppointment = {
  top: number;
  height: number;
  color: string;
  time: string;
  serviceName: string;
}