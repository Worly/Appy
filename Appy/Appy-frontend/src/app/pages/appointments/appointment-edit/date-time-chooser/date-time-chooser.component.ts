import { AfterViewInit, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { Appointment } from 'src/app/models/appointment';
import { CalendarDay } from 'src/app/models/calendar-day';
import { FreeTime } from 'src/app/models/free-time';
import { WorkingHour } from 'src/app/models/working-hours';
import { AppointmentService } from 'src/app/services/appointment.service.ts';
import { DateSmartCaching } from 'src/app/utils/smart-caching';
import { AppointmentsScrollerComponent } from '../../appointments-scroller/appointments-scroller.component';

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

  private _date: moment.Moment = moment();
  @Input() set date(value: moment.Moment | undefined) {
    if (value == null)
      value = moment();

    if (this._date.isSame(value, "date"))
      return;

    this._date = value;

    this.refreshShadowAppointments();
    this.load();
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
    private appointmentService: AppointmentService
  ) { }

  ngOnInit(): void {
    this.load();
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

    let dayStart: moment.Moment | null = null;
    let dayEnd: moment.Moment | null = null;

    if (this.calendarDay?.workingHours) {
      for (let workingHour of this.calendarDay.workingHours as WorkingHour[]) {
        if (dayStart == null || workingHour.timeFrom?.isBefore(dayStart))
          dayStart = workingHour.timeFrom as moment.Moment;

        if (dayEnd == null || workingHour.timeTo?.isAfter(dayEnd))
          dayEnd = workingHour.timeTo as moment.Moment;
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

        let minutesData: TimeData = {
          time: m,
          isWorkingHour: isWorkingHour
        };

        this.minutesData[h].push(minutesData);
      }

      let hourData: TimeData = {
        time: h,
        isWorkingHour: this.minutesData[h].some(p => p.isWorkingHour)
      };

      this.hoursData.push(hourData);
      if (dayStart != null && dayEnd != null
        && h >= dayStart.hours()
        && (dayEnd.minutes() == 0 && h < dayEnd.hours() || dayEnd.minutes() > 0 && h <= dayEnd.hours()))
        this.displayHoursData?.push(hourData);
    }
  }
}

export type DateTimeChooserResult = {
  date?: moment.Moment;
  time?: moment.Moment;
  ok: boolean;
}

type TimeData = {
  time: number;
  isWorkingHour: boolean;
}