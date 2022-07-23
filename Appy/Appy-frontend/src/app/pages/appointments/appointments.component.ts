import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { CalendarTodayHeaderComponent } from 'src/app/components/calendar-today-header/calendar-today-header.component';
import { Appointment } from 'src/app/models/appointment';
import { AppointmentService } from 'src/app/services/appointment.service.ts';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit, OnDestroy {

  private subs: Subscription[] = [];

  public date: moment.Moment = moment();
  public calendarTodayHeaderComponent = CalendarTodayHeaderComponent;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private appointmentService: AppointmentService,
  ) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  goToNew() {
    this.router.navigate(["new"], { relativeTo: this.activatedRoute });
  }
}
