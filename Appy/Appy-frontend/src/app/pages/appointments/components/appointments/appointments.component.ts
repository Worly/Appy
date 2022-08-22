import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import dayjs, { Dayjs } from 'dayjs';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit, OnDestroy {

  private subs: Subscription[] = [];

  public date: Dayjs = dayjs();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  goToNew(date?: Dayjs, clickedTime?: Dayjs) {
    if (date == null)
      date = this.date;

    this.router.navigate(["new"], {
      queryParams: {
        date: date.format("YYYY-MM-DD"),
        clickedTime: clickedTime ? clickedTime.format("HH:mm:ss") : null
      },
      relativeTo: this.activatedRoute
    });
  }

  onCalendarClick(time: Dayjs) {
    this.goToNew(time, time);
  }
}
