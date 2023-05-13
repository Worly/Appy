import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import dayjs, { Dayjs } from 'dayjs';
import { Subscription } from 'rxjs';
import { setUrlParams } from 'src/app/utils/dynamic-url-params';

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit, OnDestroy {

  private _date: Dayjs = dayjs();
  public set date(value: Dayjs) {
    if (this._date.isSame(value, "date"))
      return;

    this._date = value;

    this.updateUrl();
  }
  public get date(): Dayjs {
    return this._date;
  }

  private _type: AppointmentsDisplayType = "scroller";
  public set type(value: AppointmentsDisplayType) {
    if (this._type == value)
      return;

    this._type = value;

    this.updateLocalStorage();
  }
  public get type(): AppointmentsDisplayType {
    return this._type;
  }

  private readonly TYPE_KEY = "APPOINTMENTS_TYPE";

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private location: Location,
    private activatedRoute: ActivatedRoute,
  ) { }

  ngOnInit(): void {
    this.subs.push(this.activatedRoute.queryParamMap.subscribe(params => {
      let dateStr = params.get("date");
      if (dateStr != null)
        this.date = dayjs(dateStr, "YYYY-MM-DD");
    }));

    let type = localStorage.getItem(this.TYPE_KEY);
    if (type == "scroller" || type == "list")
      this.type = type;
    else
      this.type = "scroller";
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private updateUrl() {
    setUrlParams(this.router, this.activatedRoute, this.location, {
      date: this.date.format("YYYY-MM-DD"),
      type: this.type
    });
  }

  private updateLocalStorage() {
    localStorage.setItem(this.TYPE_KEY, this.type);
  }

  goToNew(date?: Dayjs, clickedTime?: Dayjs) {
    if (date == null)
      date = this.date;

    this.router.navigate(["new"], {
      queryParams: {
        date: date.format("YYYY-MM-DD"),
        time: clickedTime ? clickedTime.format("HH:00:00") : null
      },
      relativeTo: this.activatedRoute
    });
  }

  onCalendarClick(time: Dayjs) {
    this.goToNew(time, time);
  }
}

export type AppointmentsDisplayType = "scroller" | "list";