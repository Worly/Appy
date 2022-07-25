import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as moment from 'moment';
import { Appointment } from 'src/app/models/appointment';

@Component({
  selector: 'app-date-time-chooser',
  templateUrl: './date-time-chooser.component.html',
  styleUrls: ['./date-time-chooser.component.scss']
})
export class DateTimeChooserComponent implements OnInit {

  private _appointment?: Appointment;
  @Input() set appointment(value: Appointment | undefined) {
    this._appointment = value == null ? undefined : new Appointment(value.getDTO());

    if (this._appointment) {
      this._appointment.date = this.date;
      this._appointment.time = this.time;
    }

    this.shadowAppointments = this.appointment ? [this.appointment] : [];
  }
  get appointment(): Appointment | undefined {
    return this._appointment;
  }

  private _date: moment.Moment = moment();
  @Input() set date(value: moment.Moment | undefined) {
    if (value == null)
      value = moment();

    if (this._date.isSame(value, "date"))
      return;

    this._date = value;

    if (this.appointment) {
      this.appointment.date = this.date;
      this.shadowAppointments = this.appointment ? [this.appointment] : [];
    }
  }
  get date(): moment.Moment {
    return this._date;
  }

  private defaultTime = moment({ hours: 8, minutes: 0 });
  private _time: moment.Moment = this.defaultTime;
  @Input() set time(value: moment.Moment | undefined) {
    if (value == null)
      value = this.defaultTime;

    if (this._time.isSame(value))
      return;

    this._time = value;

    if (this.appointment) {
      this.appointment.time = this.time;
      this.shadowAppointments = this.appointment ? [this.appointment] : [];
    }
  }
  get time(): moment.Moment {
    return this._time;
  }

  @Output() finished: EventEmitter<DateTimeChooserResult> = new EventEmitter();

  minutes: number[] = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  hours: number[] = [8, 9, 10, 11, 12, 13];

  shadowAppointments: Appointment[] = [];

  constructor() { }

  ngOnInit(): void {
  }

  selectHours(hours: number) {
    this.time = this.time.clone().hours(hours);
  }

  selectMinutes(hours: number) {
    this.time = this.time.clone().minutes(hours);
  }

  cancel() {
    this.finished.emit({
      ok: false
    });
  }

  ok() {
    this.finished.emit({
      date: this.date,
      time: this.time,
      ok: true
    });
  }
}

export type DateTimeChooserResult = {
  date?: moment.Moment;
  time?: moment.Moment;
  ok: boolean;
}
