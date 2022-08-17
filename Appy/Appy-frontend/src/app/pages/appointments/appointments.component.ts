import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { CalendarTodayHeaderComponent } from 'src/app/components/calendar-today-header/calendar-today-header.component';
import { Moment } from 'moment';
import moment from "moment/moment";

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit, OnDestroy {

  private subs: Subscription[] = [];

  public date: Moment = moment();
  public calendarTodayHeaderComponent = CalendarTodayHeaderComponent;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  goToNew(date?: Moment, clickedTime?: Moment) {
    if (date == null)
      date = this.date;

    this.router.navigate(["new"], {
      queryParams: {
        date: date.format("yyyy-MM-DD"),
        clickedTime: clickedTime ? clickedTime.format("HH:mm:ss") : null
      },
      relativeTo: this.activatedRoute
    });
  }

  onCalendarClick(time: Moment) {
    this.goToNew(time, time);
  }
}
