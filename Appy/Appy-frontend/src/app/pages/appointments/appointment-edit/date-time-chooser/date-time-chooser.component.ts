import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { Appointment } from 'src/app/models/appointment';
import { CalendarDay } from 'src/app/models/calendar-day';
import { FreeTime } from 'src/app/models/free-time';
import { WorkingHour } from 'src/app/models/working-hours';
import { AppointmentService } from 'src/app/services/appointment.service.ts';
import { DateSmartCaching } from 'src/app/utils/smart-caching';
import { AppointmentsScrollerComponent } from '../../appointments-scroller/appointments-scroller.component';
import moment, { Duration } from "moment/moment";
import { Moment } from 'moment';
import { Router } from '@angular/router';
import { cropRenderedInterval, getRenderedInterval, RenderedInterval } from 'src/app/utils/rendered-interval';
import { ServiceColorsService } from 'src/app/services/service-colors.service';
import { timeOnly } from 'src/app/utils/time-utils';

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

  private _date: Moment = moment();
  @Input() set date(value: Moment | undefined) {
    if (value == null)
      value = moment();

    if (this._date.isSame(value, "date"))
      return;

    this._date = value;

    this.refreshShadowAppointments();
    this.load();
  }
  get date(): Moment {
    return this._date;
  }

  private _time: Moment | undefined = undefined;
  @Input() set time(value: Moment | undefined) {
    if ((this._time == null && value == null) || (this._time != null && this._time.isSame(value)))
      return;

    this._time = value;

    this.selectedHours = this.time?.hours() ?? undefined;
    this.selectedMinutes = this.time?.minutes() ?? undefined;

    this.refreshShadowAppointments();
  }
  get time(): Moment | undefined {
    return this._time;
  }

  @Input() clickedTime?: Moment;

  @Output() finished: EventEmitter<DateTimeChooserResult> = new EventEmitter();

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
      this.time = moment({ hours: this.selectedHours, minutes: this.selectedMinutes });
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

    let dayStart: Moment | null = null;
    let dayEnd: Moment | null = null;

    if (this.calendarDay?.workingHours) {
      for (let workingHour of this.calendarDay.workingHours as WorkingHour[]) {
        if (dayStart == null || workingHour.timeFrom?.isBefore(dayStart))
          dayStart = workingHour.timeFrom as Moment;

        if (dayEnd == null || workingHour.timeTo?.isAfter(dayEnd))
          dayEnd = workingHour.timeTo as Moment;
      }
    }

    for (let h = 0; h < 24; h++) {
      this.minutesData[h] = [];

      for (let m = 0; m < 60; m += 5) {
        let time = moment({ hours: h, minutes: m });

        let isWorkingHour: boolean = false;

        for (let wh of this.calendarDay?.workingHours as WorkingHour[]) {
          if (time.isSameOrAfter(wh.timeFrom) && time.isSameOrBefore(wh.timeTo)) {
            isWorkingHour = true;
            break;
          }
        }

        let renderedAppointments: RenderedInterval<Appointment>[] = [];
        if (this.calendarDay?.appointments) {
          for (let ap of this.calendarDay?.appointments) {
            let ri = getRenderedInterval<Appointment>(time.clone(), time.clone().add({ minutes: 5 }), ap, ap.time as Moment, ap.duration as Duration, this.serviceColorsService.get(ap.service?.colorId));
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

      let time = moment({ hours: h, minutes: 0 });

      let renderedAppointments: RenderedInterval<Appointment>[] = [];
      if (this.calendarDay?.appointments) {
        for (let ap of this.calendarDay?.appointments) {
          let ri = getRenderedInterval<Appointment>(time.clone(), time.clone().add({ hours: 1 }), ap, ap.time as Moment, ap.duration as Duration, this.serviceColorsService.get(ap.service?.colorId));
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
        && h >= dayStart.hours()
        && (dayEnd.minutes() == 0 && h < dayEnd.hours() || dayEnd.minutes() > 0 && h <= dayEnd.hours()))
        this.displayHoursData?.push(hourData);
    }
  }

  onCalendarClick(time: Moment) {
    let freeTimes = this.freeTimesSmartCaching.data.find(d => d.key.isSame(this.date, "date"));
    if (freeTimes?.data == null)
      return;

    console.log(freeTimes);

    let ft = freeTimes.data.find(f => timeOnly(f.from).isSameOrBefore(timeOnly(time)) && timeOnly(f.toIncludingDuration).isSameOrAfter(timeOnly(time)));
    if (ft == null)
      return;

    let timeOnHour = moment({ hours: time.hours() });
    if (timeOnHour.isBetween(timeOnly(ft.from), timeOnly(ft.to), null, "[]"))
      this.time = timeOnHour;
    else
      this.time = ft.from.clone();
  }

  goToWorkingHours() {
    this.router.navigate(["/working-hours"]);
  }
}

export type DateTimeChooserResult = {
  date?: Moment;
  time?: Moment;
  ok: boolean;
}

type TimeData = {
  time: number;
  isWorkingHour: boolean;
  renderedAppointments: RenderedInterval<Appointment>[];
}