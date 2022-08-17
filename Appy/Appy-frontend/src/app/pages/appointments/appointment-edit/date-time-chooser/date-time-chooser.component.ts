import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { min, Subscription } from 'rxjs';
import { Appointment } from 'src/app/models/appointment';
import { CalendarDay } from 'src/app/models/calendar-day';
import { FreeTime } from 'src/app/models/free-time';
import { WorkingHour } from 'src/app/models/working-hours';
import { AppointmentService } from 'src/app/services/appointment.service.ts';
import { DateSmartCaching } from 'src/app/utils/smart-caching';
import { AppointmentsScrollerComponent } from '../../appointments-scroller/appointments-scroller.component';
import { Router } from '@angular/router';
import { cropRenderedInterval, getRenderedInterval, RenderedInterval } from 'src/app/utils/rendered-interval';
import { ServiceColorsService } from 'src/app/services/service-colors.service';
import { timeOnly } from 'src/app/utils/time-utils';
import dayjs from "dayjs";
import "dayjs/plugin/isSameOrAfter";
import "dayjs/plugin/isSameOrBefore";
import "dayjs/plugin/isBetween";
import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";

@Component({
  selector: 'app-date-time-chooser',
  templateUrl: './date-time-chooser.component.html',
  styleUrls: ['./date-time-chooser.component.scss']
})
export class DateTimeChooserComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(AppointmentsScrollerComponent) appointmentScroller?: AppointmentsScrollerComponent;

  private _appointment?: Appointment;
  @Input() set appointment(value: Appointment | undefined) {
    this._appointment = value == null ? undefined : new Appointment(value.getDTO());

    this.refreshShadowAppointments();
  }
  get appointment(): Appointment | undefined {
    return this._appointment;
  }

  private _date: Dayjs = dayjs();
  @Input() set date(value: Dayjs | undefined) {
    if (this.startDate == null)
      this.startDate = value;

    if (value == null)
      value = dayjs();

    if (this._date.isSame(value, "date"))
      return;

    this._date = value;

    this.refreshShadowAppointments();
    this.load();
  }
  get date(): Dayjs {
    return this._date;
  }

  private _time: Dayjs | undefined = undefined;
  @Input() set time(value: Dayjs | undefined) {
    if ((this._time == null && value == null) || (this._time != null && this._time.isSame(value)))
      return;

    this._time = value;

    this.selectedHours = this.time?.hour() ?? undefined;
    this.selectedMinutes = this.time?.minute() ?? undefined;

    this.refreshShadowAppointments();
  }
  get time(): Dayjs | undefined {
    return this._time;
  }

  @Input() clickedTime?: Dayjs;

  @Output() finished: EventEmitter<DateTimeChooserResult> = new EventEmitter();

  private startDate?: Dayjs;

  selectedHours?: number;
  selectedMinutes?: number;

  hoursData: TimeData[] | null = null;
  displayHoursData: TimeData[] | null = null;
  minutesData: { [time: number]: TimeData[] } | null = null;

  calendarDay: CalendarDay | null = null;

  shadowAppointments: Appointment[] = [];
  public freeTimesSmartCaching: DateSmartCaching<FreeTime[]> = new DateSmartCaching(d => {
    if (this.appointment == null || this.appointment.service == null || this.appointment.duration == null) {
      throw new Error("Appointment or its data is null");
    }

    return this.appointmentService.getFreeTimes(d, this.appointment.service.id, this.appointment.duration, this.appointment.id);
  }, 1);

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private appointmentService: AppointmentService,
    private serviceColorsService: ServiceColorsService
  ) { }

  ngOnInit(): void {
    this.load();

    this.subs.push(this.freeTimesSmartCaching.onDataLoaded.subscribe(e => {
      if (this.time == null && this.clickedTime != null && e.key.isSame(this.date, "date"))
        this.onCalendarClick(this.clickedTime);
    }))
  }

  ngAfterViewInit(): void {
    if (this.appointmentScroller)
      this.subs.push(this.appointmentScroller.calendarDaySmartCaching.onDataLoaded.subscribe(() => this.tryGetCalendarDay()));
  }

  ngOnDestroy(): void {
    this.freeTimesSmartCaching.dispose();
    this.subs.forEach(s => s.unsubscribe());
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
    this.time = undefined;

    this.selectedHours = hours;
    this.updateTime();
  }

  selectMinutes(minutes: number) {
    this.selectedMinutes = minutes;

    this.updateTime();
  }

  private updateTime() {
    if (this.selectedHours != null && this.selectedMinutes != null)
      this.time = dayjs({ hour: this.selectedHours, minutes: this.selectedMinutes });
    else
      this.time = undefined;
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

  private load() {
    this.freeTimesSmartCaching.load(this.date);

    this.calendarDay = null;
    this.displayHoursData = null;
    this.hoursData = null;
    this.minutesData = null;

    if (!this.startDate?.isSame(this.date, "date"))
      this.time = undefined;

    this.tryGetCalendarDay();
  }

  private tryGetCalendarDay() {
    if (this.appointmentScroller == null)
      return;

    let data = this.appointmentScroller.calendarDaySmartCaching.data;

    let calendarDay = data.find(d => d.key.isSame(this.date, "date"))?.data;
    if (calendarDay != null &&
      (this.calendarDay == null || !this.calendarDay.date?.isSame(calendarDay.date, "date"))) {
      this.calendarDay = calendarDay;
      this.calculateTimeData();
    }
  }

  private calculateTimeData() {
    this.hoursData = [];
    this.displayHoursData = [];
    this.minutesData = {};

    let dayStart: Dayjs | null = null;
    let dayEnd: Dayjs | null = null;

    if (this.calendarDay?.workingHours) {
      for (let workingHour of this.calendarDay.workingHours as WorkingHour[]) {
        if (dayStart == null || workingHour.timeFrom?.isBefore(dayStart))
          dayStart = workingHour.timeFrom as Dayjs;

        if (dayEnd == null || workingHour.timeTo?.isAfter(dayEnd))
          dayEnd = workingHour.timeTo as Dayjs;
      }
    }

    let appointments = this.calendarDay?.appointments?.filter(a => a.id != this.appointment?.id);

    for (let h = 0; h < 24; h++) {
      this.minutesData[h] = [];

      for (let m = 0; m < 60; m += 5) {
        let time = dayjs({ hour: h, minute: m });

        let isWorkingHour: boolean = false;

        for (let wh of this.calendarDay?.workingHours as WorkingHour[]) {
          if (time.isSameOrAfter(wh.timeFrom) && time.isSameOrBefore(wh.timeTo)) {
            isWorkingHour = true;
            break;
          }
        }

        let renderedAppointments: RenderedInterval<Appointment>[] = [];
        if (appointments) {
          for (let ap of appointments) {
            let ri = getRenderedInterval<Appointment>(time, time.add(5, "minutes"), ap, ap.time as Dayjs, ap.duration as Duration, this.serviceColorsService.get(ap.service?.colorId));
            ri = cropRenderedInterval(ri);
            if (ri)
              renderedAppointments.push(ri);
          }
        }

        let minutesData: TimeData = {
          time: m,
          isWorkingHour: isWorkingHour,
          renderedAppointments: renderedAppointments
        };

        this.minutesData[h].push(minutesData);
      }

      let time = dayjs({ hour: h });

      let renderedAppointments: RenderedInterval<Appointment>[] = [];
      if (appointments) {
        for (let ap of appointments) {
          let ri = getRenderedInterval<Appointment>(time, time.add(1, "hour"), ap, ap.time as Dayjs, ap.duration as Duration, this.serviceColorsService.get(ap.service?.colorId));
          ri = cropRenderedInterval(ri);
          if (ri)
            renderedAppointments.push(ri);
        }
      }

      let hourData: TimeData = {
        time: h,
        isWorkingHour: this.minutesData[h].some(p => p.isWorkingHour),
        renderedAppointments: renderedAppointments
      };

      this.hoursData.push(hourData);
      if (dayStart != null && dayEnd != null
        && h >= dayStart.hour()
        && (dayEnd.minute() == 0 && h < dayEnd.hour() || dayEnd.minute() > 0 && h <= dayEnd.hour()))
        this.displayHoursData?.push(hourData);
    }
  }

  onCalendarClick(time: Dayjs) {
    let freeTimes = this.freeTimesSmartCaching.data.find(d => d.key.isSame(this.date, "date"));
    if (freeTimes?.data == null)
      return;

    let ft = freeTimes.data.find(f => timeOnly(f.from).isSameOrBefore(timeOnly(time)) && timeOnly(f.toIncludingDuration).isSameOrAfter(timeOnly(time)));
    if (ft == null)
      return;

    let timeOnHour = timeOnly(time.startOf("hour"));
    if (timeOnHour.isBetween(timeOnly(ft.from), timeOnly(ft.to), null, "[]"))
      this.time = timeOnHour;
    else
      this.time = ft.from;
  }

  getContainsSelection(hours: number, minutes: number): boolean {
    let time = dayjs({ hour: hours, minute: minutes });

    if (this.appointment?.duration == null || this.appointment?.time == null)
      return false;

    return time.isBetween(this.appointment.time, this.appointment.time.add(this.appointment.duration), null, "[)");
  }

  goToWorkingHours() {
    this.router.navigate(["/working-hours"]);
  }
}

export type DateTimeChooserResult = {
  date?: Dayjs;
  time?: Dayjs;
  ok: boolean;
}

type TimeData = {
  time: number;
  isWorkingHour: boolean;
  renderedAppointments: RenderedInterval<Appointment>[];
}