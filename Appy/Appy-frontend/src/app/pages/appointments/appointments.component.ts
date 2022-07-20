import { Component, OnDestroy, OnInit } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { Appointment } from 'src/app/models/appointment';
import { AppointmentService } from 'src/app/services/appointment.service.ts';
import { SingleDayAppointmentsData } from './single-day-appointments/single-day-appointments.component';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit, OnDestroy {

  public data?: SingleDayAppointmentsData;
  public data2?: SingleDayAppointmentsData;

  public timeFrom: moment.Moment = moment({ hours: 7, minutes: 30 });
  public timeTo: moment.Moment = moment({ hours: 14, minutes: 30 });

  private subs: Subscription[] = [];

  constructor(
    private appointmentService: AppointmentService
  ) { }

  ngOnInit(): void {
    let today = moment();
    let tommorrow = today.clone().add({ days: 1 });

    this.subs.push(this.appointmentService.getAll(today)
      .subscribe((a: Appointment[]) => {
        this.data = {
          date: today,
          appointments: a
        };
      }));

    this.subs.push(this.appointmentService.getAll(tommorrow)
      .subscribe((a: Appointment[]) => {
        this.data2 = {
          date: tommorrow,
          appointments: a
        };
      }));

    // setInterval(() => this.timeTo = this.timeTo.clone().add({ seconds: 40 }), 10);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  getHeight(): string {
    return (this.timeTo.diff(this.timeFrom, "hours", true) / 9) * 100 + "vh";
  }
}
