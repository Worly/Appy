import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { min, Subscription } from 'rxjs';
import { Appointment } from 'src/app/models/appointment';
import { CalendarDay } from 'src/app/models/calendar-day';
import { FreeTime } from 'src/app/models/free-time';
import { WorkingHour } from 'src/app/models/working-hours';
import { AppointmentService } from 'src/app/services/appointment.service.ts';
import { DateSmartCaching } from 'src/app/utils/smart-caching';
import { AppointmentsScrollerComponent } from '../../appointments-scroller/appointments-scroller.component';
import { Router } from '@angular/router';
import { cropRenderedInterval, getIntervalHeight, getIntervalTop, getRenderedAppointments, RenderedInterval } from 'src/app/utils/rendered-interval';
import { ServiceColorsService } from 'src/app/services/service-colors.service';
import { overlap, timeOnly } from 'src/app/utils/time-utils';
import dayjs from "dayjs";
import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";
import { ContextMenuComponent } from 'src/app/components/context-menu/context-menu.component';
import { TimeData } from './time-button/time-button.component';

@Component({
  selector: 'app-date-time-chooser',
  templateUrl: './date-time-chooser.component.html',
  styleUrls: ['./date-time-chooser.component.scss']
})
export class DateTimeChooserComponent implements OnInit, OnDestroy, AfterViewInit {

  @ViewChild(AppointmentsScrollerComponent) appointmentScroller?: AppointmentsScrollerComponent;
  @ViewChild("hoursContextMenu", { read: ContextMenuComponent }) hoursContextMenu?: ContextMenuComponent;
  @ViewChildren("hoursContextMenuButtons", { read: ElementRef<HTMLElement> }) hoursButtons?: QueryList<ElementRef<HTMLElement>>;

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

  showAnyHour: boolean = false;

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
      this.tryCalculateTimeData();

      // apply calendar click from AppointmentsComponent
      if (this.time == null && this.clickedTime != null && e.key.isSame(this.date, "date"))
        this.onCalendarClick(this.clickedTime);
    }));
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

    if (!this.startDate?.isSame(this.date, "date")) {
      this.time = undefined;
      this.selectedHours = undefined;
      this.selectedMinutes = undefined;
    }

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
      this.tryCalculateTimeData();
    }
  }

  private tryCalculateTimeData() {
    if (this.calendarDay?.workingHours == null || this.freeTimesSmartCaching.singleData == null)
      return;

    if (this.hoursData != null && this.minutesData != null && this.displayHoursData != null)
      return;

    this.hoursData = [];
    this.displayHoursData = [];
    this.minutesData = {};

    let dayStart: Dayjs | null = null;
    let dayEnd: Dayjs | null = null;

    if (this.calendarDay.workingHours) {
      for (let workingHour of this.calendarDay.workingHours as WorkingHour[]) {
        if (dayStart == null || workingHour.timeFrom?.isBefore(dayStart))
          dayStart = workingHour.timeFrom as Dayjs;

        if (dayEnd == null || workingHour.timeTo?.isAfter(dayEnd))
          dayEnd = workingHour.timeTo as Dayjs;
      }
    }

    let appointments = this.calendarDay.appointments?.filter(a => a.id != this.appointment?.id);

    let renderedAppointments = getRenderedAppointments(this.date, dayjs({ hours: 0 }), dayjs({ hours: 23 }), appointments ?? null, this.serviceColorsService, { layout: true });

    for (let h = 0; h < 24; h++) {
      this.minutesData[h] = [];
      let time = dayjs({ hour: h });

      let isWorkingHour = this.calendarDay.workingHours.some(wh => overlap(time, time.add(1, "hour"), wh.timeFrom as Dayjs, wh.timeTo as Dayjs));
      let isFreeHour = this.freeTimesSmartCaching.singleData.some(f => overlap(time, time.add(1, "hour"), f.from, f.to, "[)"));
      let isFreeHourIncluding = this.freeTimesSmartCaching.singleData.some(f => overlap(time, time.add(1, "hour"), f.from, f.toIncludingDuration, "()"));

      for (let m = 0; m < 60; m += 5) {
        let time = dayjs({ hour: h, minute: m });

        let isWorkingMinute = isWorkingHour && this.calendarDay.workingHours.some(wh => time.isBetween(wh.timeFrom, wh.timeTo, null, "[)"));
        let isFreeMinute = isFreeHour && this.freeTimesSmartCaching.singleData.some(f => time.isBetween(f.from, f.to, null, "[]"));
        let isFreeMinuteIncluding = isFreeHourIncluding && this.freeTimesSmartCaching.singleData.some(f => time.isBetween(f.from, f.toIncludingDuration, null, "[)"));

        let localRenderedAppointments: RenderedInterval<Appointment>[] = [];
        for (let ap of renderedAppointments) {
          let ri = { ...ap };
          ri.top = getIntervalTop(time, time.add(5, "minutes"), ap.source.time as Dayjs);
          ri.height = getIntervalHeight(time, time.add(5, "minutes"), ap.source.duration as Duration);
          let cropped = cropRenderedInterval(ri);
          if (cropped != null)
            localRenderedAppointments.push(cropped);
        }

        let minutesData: TimeData = {
          time: m,
          isWorkingHour: isWorkingMinute,
          isFreeTime: isFreeMinute,
          isFreeTimeIncluding: isFreeMinuteIncluding,
          renderedAppointments: localRenderedAppointments
        };

        this.minutesData[h].push(minutesData);
      }

      let localRenderedAppointments: RenderedInterval<Appointment>[] = [];
      for (let ap of renderedAppointments) {
        let ri = { ...ap };
        ri.top = getIntervalTop(time, time.add(1, "hour"), ap.source.time as Dayjs);
        ri.height = getIntervalHeight(time, time.add(1, "hour"), ap.source.duration as Duration);
        let cropped = cropRenderedInterval(ri);
        if (cropped != null)
          localRenderedAppointments.push(cropped);
      }

      let hourData: TimeData = {
        time: h,
        isWorkingHour: isWorkingHour,
        isFreeTime: isFreeHour,
        isFreeTimeIncluding: isFreeHourIncluding,
        renderedAppointments: localRenderedAppointments
      };

      this.hoursData.push(hourData);
      if (dayStart != null && dayEnd != null
        && h >= dayStart.hour()
        && (dayEnd.minute() == 0 && h < dayEnd.hour() || dayEnd.minute() > 0 && h <= dayEnd.hour()))
        this.displayHoursData?.push(hourData);
    }

    // feature: when opening an already selected time which is outside of working hours, automatically switch to showAnyHour
    if (this.selectedHours != null && !this.displayHoursData.some(h => h.time == this.selectedHours))
      this.showAnyHour = true;
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

  toggleShowAnyHour() {
    this.showAnyHour = !this.showAnyHour;

    // if selected hour from dropdown is not visible in the display list, then unselect it
    if (!this.showAnyHour && this.selectedHours != null) {
      if (!this.displayHoursData?.some(d => d.time == this.selectedHours)) {
        this.time = undefined;
        this.selectedHours = undefined;
        this.selectedMinutes = undefined;
      }
    }
  }

  chooseHourClicked() {
    this.hoursContextMenu?.toggle();

    // scroll selected into view
    if (this.selectedHours == null)
      return;

    if (this.hoursContextMenu?.isOpen() && this.hoursButtons != null) {
      let selectedButton = this.hoursButtons.find(b => b.nativeElement.classList.contains("selected"));
      if (selectedButton == null)
        return;

      let buttonElement = selectedButton.nativeElement as HTMLElement;
      let parentElement = buttonElement.parentElement?.parentElement as HTMLElement;

      let scrollPosition = buttonElement.getBoundingClientRect().top;

      parentElement.scrollTop = scrollPosition - 80;

      parentElement.scrollTo({
        top: scrollPosition,
        behavior: "smooth"
      });
    }
  }
}

export type DateTimeChooserResult = {
  date?: Dayjs;
  time?: Dayjs;
  ok: boolean;
}