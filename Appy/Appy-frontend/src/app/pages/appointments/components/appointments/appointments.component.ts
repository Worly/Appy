import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import dayjs, { Dayjs } from 'dayjs';
import { Subscription } from 'rxjs';
import { BeforeAttach, BeforeDetach } from 'src/app/services/attach-detach-hooks.service';
import { ClientDTO } from 'src/app/models/client';
import { ServiceDTO } from 'src/app/models/service';
import { setUrlParams } from 'src/app/utils/dynamic-url-params';
import { AppointmentsListComponent } from '../appointments-list/appointments-list.component';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
import { FieldFilter, SmartFilter } from 'src/app/shared/services/smart-filter';

export type AppointmentsFilter = {
  client?: ClientDTO
  service?: ServiceDTO
};

export function appFilterToSmartFilter(filter: AppointmentsFilter): SmartFilter | undefined {
  let fieldFilters: SmartFilter[] = [];

  if (filter.client != null)
    fieldFilters.push(["client.id", "==", filter.client.id])

  if (filter.service != null)
    fieldFilters.push(["service.id", "==", filter.service?.id])

  if (fieldFilters.length == 0) {
    return undefined;
  }

  return fieldFilters.reduce((a, b) => [a, "and", b]);
}

@Component({
  selector: 'app-appointments',
  templateUrl: './appointments.component.html',
  styleUrls: ['./appointments.component.scss']
})
export class AppointmentsComponent implements OnInit, OnDestroy, BeforeDetach, BeforeAttach {
  @ViewChild(AppointmentsListComponent) appointmentListComponent?: AppointmentsListComponent;

  @ViewChild("filterDialog") filterDialog?: DialogComponent;

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

  filter: AppointmentsFilter = {}

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

  ngBeforeDetach(): void {
    this.appointmentListComponent?.ngBeforeDetach();
  }

  ngBeforeAttach(): void {
    this.appointmentListComponent?.ngBeforeAttach();
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

  applyFilter(filter: AppointmentsFilter) {
    this.filterDialog?.close();

    this.filter = filter;
  }
}

export type AppointmentsDisplayType = "scroller" | "list";