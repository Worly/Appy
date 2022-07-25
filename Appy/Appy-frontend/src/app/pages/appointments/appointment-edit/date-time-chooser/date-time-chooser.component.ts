import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { Appointment } from 'src/app/models/appointment';
import { FreeTime } from 'src/app/models/free-time';
import { AppointmentService } from 'src/app/services/appointment.service.ts';

@Component({
  selector: 'app-date-time-chooser',
  templateUrl: './date-time-chooser.component.html',
  styleUrls: ['./date-time-chooser.component.scss']
})
export class DateTimeChooserComponent implements OnInit {

  private _appointment?: Appointment;
  @Input() set appointment(value: Appointment | undefined) {
    this._appointment = value == null ? undefined : new Appointment(value.getDTO());

    this.refreshShadowAppointments();
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

    this.refreshShadowAppointments();
    this.loadFreeTimes();
  }
  get date(): moment.Moment {
    return this._date;
  }

  private _time: moment.Moment | undefined = undefined;
  @Input() set time(value: moment.Moment | undefined) {
    if ((this._time == null && value == null) || (this._time != null && this._time.isSame(value)))
      return;

    this._time = value;

    this.selectedHours = this.time?.hours() ?? undefined;
    this.selectedMinutes = this.time?.minutes() ?? undefined;

    this.refreshShadowAppointments();
  }
  get time(): moment.Moment | undefined {
    return this._time;
  }

  @Output() finished: EventEmitter<DateTimeChooserResult> = new EventEmitter();

  selectedHours?: number;
  selectedMinutes?: number;

  minutes: number[] = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  hours: number[] = [8, 9, 10, 11, 12, 13];

  shadowAppointments: Appointment[] = [];
  freeTimes: FreeTime[] | null = null;

  private freeTimesSubscription?: Subscription;

  constructor(
    private appointmentService: AppointmentService
  ) { }

  ngOnInit(): void {
    this.loadFreeTimes();
  }

  private refreshShadowAppointments() {
    if (this.appointment) {
      this.appointment.date = this.date;
      this.appointment.time = this.time;
    }

    this.shadowAppointments = [];
    if (this.appointment && this.appointment.date && this.appointment.time)
      this.shadowAppointments = [this.appointment];
  }

  selectHours(hours: number) {
    this.selectedHours = hours;

    this.updateTime();
  }

  selectMinutes(minutes: number) {
    this.selectedMinutes = minutes;

    this.updateTime();
  }

  private updateTime() {
    if (this.selectedHours != null && this.selectedMinutes != null)
      this.time = moment({ hours: this.selectedHours, minutes: this.selectedMinutes });
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

  private loadFreeTimes() {
    this.freeTimes = null;

    if (this.freeTimesSubscription)
      this.freeTimesSubscription.unsubscribe();

    if (this.appointment && this.appointment.service && this.appointment.duration) {
      this.freeTimesSubscription = this.appointmentService.getFreeTimes(this.date, this.appointment.service.id, this.appointment.duration, this.appointment.id)
        .subscribe(f => this.freeTimes = f);
    }
  }
}

export type DateTimeChooserResult = {
  date?: moment.Moment;
  time?: moment.Moment;
  ok: boolean;
}
