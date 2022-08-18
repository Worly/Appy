import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { min, Subscription } from 'rxjs';
import { CalendarTodayHeaderComponent } from 'src/app/components/calendar-today-header/calendar-today-header.component';
import { Appointment } from 'src/app/models/appointment';
import { FreeTime } from 'src/app/models/free-time';
import { ServiceColorsService } from 'src/app/services/service-colors.service';
import { invertTimesCustom } from 'src/app/utils/invert-times';
import { WorkingHour } from 'src/app/models/working-hours';
import { cropRenderedInterval, getRenderedInterval, layoutRenderedIntervals, RenderedInterval } from 'src/app/utils/rendered-interval';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
import dayjs, { Dayjs, unix } from 'dayjs';
import { Duration } from 'dayjs/plugin/duration';

@Component({
  selector: 'app-single-day-appointments',
  templateUrl: './single-day-appointments.component.html',
  styleUrls: ['./single-day-appointments.component.scss']
})
export class SingleDayAppointmentsComponent implements OnInit, OnDestroy {

  @ViewChild("timeBackground", { read: ElementRef }) timeBackground?: ElementRef<HTMLElement>;
  @ViewChild("appointmentDialog", { read: DialogComponent }) appointmentDialog?: DialogComponent;

  private _appointments: Appointment[] | null = null;
  @Input() set appointments(value: Appointment[] | null) {
    if (this._appointments == value)
      return;

    this._appointments = value;
    this.renderAppointments();
  }
  public get appointments(): Appointment[] | null {
    return this._appointments;
  }

  private _date: Dayjs | null = null;
  @Input() set date(value: Dayjs | null) {
    if (this._date == value)
      return;

    this._date = value;
  }
  public get date(): Dayjs | null {
    return this._date;
  }

  private _workingHours: WorkingHour[] | null = null;
  @Input() set workingHours(value: WorkingHour[] | null) {
    if (this._workingHours == value)
      return;

    this._workingHours = value;
    this.renderTimeStatuses();
  }
  public get workingHours(): WorkingHour[] | null {
    return this._workingHours;
  }

  private _timeFrom: Dayjs = dayjs({ hours: 0 });
  @Input() set timeFrom(value: Dayjs) {
    if (this._timeFrom.isSame(value))
      return;

    this._timeFrom = value;
    this.render();
  }
  get timeFrom(): Dayjs {
    return this._timeFrom;
  }

  private _timeTo: Dayjs = dayjs({ hour: 23, minute: 59 });
  @Input() set timeTo(value: Dayjs) {
    if (this._timeTo.isSame(value))
      return;

    this._timeTo = value;
    this.render();
  }
  get timeTo(): Dayjs {
    return this._timeTo;
  }

  private _shadowAppointments: Appointment[] = [];
  @Input() set shadowAppointments(value: Appointment[]) {
    if (this._shadowAppointments == value)
      return;

    this._shadowAppointments = value;
    this.renderShadowAppointments();
  }
  get shadowAppointments(): Appointment[] {
    return this._shadowAppointments;
  }

  private _freeTimes: FreeTime[] | null = null;
  @Input() set freeTimes(value: FreeTime[] | null) {
    if (this._freeTimes == value)
      return;

    this._freeTimes = value;
    this.renderTimeStatuses();
  }
  get freeTimes(): FreeTime[] | null {
    return this._freeTimes;
  }

  @Input() showDateControls: boolean = false;
  @Input() appointmentsEditable: boolean = true;
  @Output() dateControlPrevious: EventEmitter<void> = new EventEmitter();
  @Output() dateControlNext: EventEmitter<void> = new EventEmitter();
  @Output() dateControlSelect: EventEmitter<Dayjs> = new EventEmitter();
  @Output() onCalendarClick: EventEmitter<Dayjs> = new EventEmitter();

  calendarTodayHeaderComponent = CalendarTodayHeaderComponent;

  public currentTimeIndicatorTop: number = 0;
  public renderedAppointments: RenderedInterval<Appointment>[] = [];
  public renderedShadowAppointments: RenderedInterval<Appointment>[] = [];
  public renderedTimeStatuses: RenderedInterval<string>[] = [];

  viewAppointmentId?: number;

  private subs: Subscription[] = [];
  private interval: any;

  constructor(
    public serviceColorsService: ServiceColorsService
  ) { }

  ngOnInit(): void {
    this.interval = setInterval(() => this.renderCurrentTimeIndicator(), 10000);
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    clearInterval(this.interval)
  }

  public render(): void {
    this.renderCurrentTimeIndicator();
    this.renderAppointments();
    this.renderShadowAppointments();
    this.renderTimeStatuses();
  }

  public renderAppointments(): void {
    this.renderedAppointments = [];
    if (this.appointments) {
      for (let ap of this.appointments) {
        let ra = this.getRenderedAppointment(ap);

        if (ra)
          this.renderedAppointments.push(ra);
      }
    }
    layoutRenderedIntervals(this.renderedAppointments);
  }

  public renderShadowAppointments(): void {
    this.renderedShadowAppointments = [];
    for (let ap of this.shadowAppointments) {
      let ra = this.getRenderedAppointment(ap);

      if (ra)
        this.renderedShadowAppointments.push(ra);
    }
  }

  public renderTimeStatuses(): void {
    this.renderedTimeStatuses = [];

    if (this.freeTimes != null) {
      for (let freeTime of this.freeTimes) {
        let ri = getRenderedInterval<string>(this.timeFrom, this.timeTo, "free-time", freeTime.from, dayjs.duration(freeTime.toIncludingDuration.diff(freeTime.from)));
        ri = cropRenderedInterval(ri);
        if (ri)
          this.renderedTimeStatuses.push(ri);
      }

      let takenTimes = invertTimesCustom(this.freeTimes, t => t.from, t => t.toIncludingDuration, this.timeFrom, this.timeTo);
      for (let takenTime of takenTimes) {
        let ri = getRenderedInterval<string>(this.timeFrom, this.timeTo, "taken-time", takenTime.from, dayjs.duration(takenTime.to.diff(takenTime.from)));
        ri = cropRenderedInterval(ri);
        if (ri)
          this.renderedTimeStatuses.push(ri);
      }
    }

    if (this.workingHours != null) {
      let closedTimes = invertTimesCustom(this.workingHours, t => t.timeFrom as Dayjs, t => t.timeTo as Dayjs, this.timeFrom, this.timeTo);
      for (let closedTime of closedTimes) {
        let ri = getRenderedInterval<string>(this.timeFrom, this.timeTo, "closed-time", closedTime.from, dayjs.duration(closedTime.to.diff(closedTime.from)));
        ri = cropRenderedInterval(ri);
        if (ri)
          this.renderedTimeStatuses.push(ri);
      }
    }
  }

  public renderCurrentTimeIndicator(): void {
    this.currentTimeIndicatorTop = (dayjs().diff(this.timeFrom) / this.timeTo.diff(this.timeFrom)) * 100;
  }

  private getRenderedAppointment(ap: Appointment): RenderedInterval<Appointment> | null {
    if (!ap.date?.isSame(this.date, "date"))
      return null;

    let ri = getRenderedInterval(this.timeFrom, this.timeTo, ap, ap.time as Dayjs, ap.duration as Duration, this.serviceColorsService.get(ap.service?.colorId))
    return cropRenderedInterval(ri, true);
  }

  // returns arrays of numbers where each number represents a cell in table which shows hours
  // each number is from <0 to 1] where it represents percentage of table height
  public getHoursToRender(): { hour: string, heightPercentage: number }[] {
    if (this.timeFrom.hour() == this.timeTo.hour())
      return [{ hour: this.timeFrom.format("H:mm"), heightPercentage: 1 }];

    let hours = [];

    let current = this.timeFrom.hour();

    hours.push({ hour: this.timeFrom.format("H:mm"), heightPercentage: (60 - this.timeFrom.minute()) / 60 });
    current++;

    while (current < this.timeTo.hour()) {
      hours.push({ hour: current + ":00", heightPercentage: 1 });
      current++;
    }

    if (this.timeTo.minute() > 0)
      hours.push({ hour: this.timeTo.hour() + ":00", heightPercentage: this.timeTo.minute() / 60 });

    return hours.map(h => { return { hour: h.hour, heightPercentage: h.heightPercentage / hours.length } });
  }

  public getNowDate(): Dayjs {
    return dayjs();
  }

  public onTimeBackgroundClick(e: MouseEvent) {
    e.preventDefault();
    e.stopImmediatePropagation();

    if (this.timeBackground == null)
      return;

    let rect = this.timeBackground.nativeElement.getBoundingClientRect();
    let y = e.clientY - rect.top;

    let percentage = y / rect.height;

    let time = unix((this.timeTo.unix() - this.timeFrom.unix()) * percentage + this.timeFrom.unix());

    let hours = time.hour();
    let minutes = Math.round(time.minute() / 5) * 5 // round to nearest 5
    if (minutes >= 60) {
      hours++;
      minutes = 0;
    }

    time = dayjs({
      year: this.date?.year(),
      month: this.date?.month(),
      date: this.date?.date(),
      hour: hours,
      minute: minutes
    });

    this.onCalendarClick.next(time);
  }

  onAppointmentClick(ap: Appointment) {
    this.viewAppointmentId = ap.id;
    this.appointmentDialog?.open();
  }

  closeAppointmentDialog() {
    this.viewAppointmentId = undefined;
    this.appointmentDialog?.close();
  }
}