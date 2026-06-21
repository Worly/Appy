import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { Appointment, AppointmentView } from 'src/app/models/appointment';
import { FreeTime } from 'src/app/models/free-time';
import { invertTimesCustom } from 'src/app/utils/invert-times';
import { WorkingHour } from 'src/app/models/working-hours';
import { TimeOffOccurrence } from 'src/app/models/time-off-occurrence';
import { getRenderedAppointments, getRenderedAppointmentViews, getRenderedIntervals, RenderedInterval } from 'src/app/utils/rendered-interval';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
import dayjs, { Dayjs, unix } from 'dayjs';
import { ServiceColorsService } from 'src/app/pages/services/services/service-colors.service';

@Component({
  selector: 'app-single-day-appointments',
  templateUrl: './single-day-appointments.component.html',
  styleUrls: ['./single-day-appointments.component.scss']
})
export class SingleDayAppointmentsComponent implements OnInit, OnDestroy {

  @ViewChild("timeBackground", { read: ElementRef }) timeBackground?: ElementRef<HTMLElement>;
  @ViewChild("appointmentDialog", { read: DialogComponent }) appointmentDialog?: DialogComponent;

  private _appointments: AppointmentView[] | null = null;
  @Input() set appointments(value: AppointmentView[] | null) {
    if (this._appointments == value)
      return;

    this._appointments = value;
    this.renderAppointments();
  }
  public get appointments(): AppointmentView[] | null {
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

  private _timeOffs: TimeOffOccurrence[] | null = null;
  @Input() set timeOffs(value: TimeOffOccurrence[] | null) {
    if (this._timeOffs == value) return;
    this._timeOffs = value;
    this.renderTimeOffs();
  }
  get timeOffs(): TimeOffOccurrence[] | null { return this._timeOffs; }

  @Input() showDateControls: boolean = false;
  @Input() appointmentsEditable: boolean = true;
  @Output() dateControlPrevious: EventEmitter<void> = new EventEmitter();
  @Output() dateControlNext: EventEmitter<void> = new EventEmitter();
  @Output() dateControlSelect: EventEmitter<Dayjs> = new EventEmitter();
  @Output() onCalendarClick: EventEmitter<Dayjs> = new EventEmitter();

  public currentTimeIndicatorTop: number = 0;
  public renderedAppointments: RenderedInterval<AppointmentView>[] = [];
  public renderedShadowAppointments: RenderedInterval<Appointment>[] = [];
  public renderedTimeStatuses: RenderedInterval<string>[] = [];
  public renderedTimeOffs: RenderedInterval<TimeOffOccurrence>[] = [];

  viewAppointmentId?: number;
  viewTimeOffId?: number;

  // The all-day occurrences of the viewed day. The hatched all-day band collapses them all into one
  // (with a "+N" label), so clicking it needs the full list to open either the single off's details
  // or a pick-list when there are several.
  private allDayTimeOffs: TimeOffOccurrence[] = [];
  // Backing the all-day pick-list dialog (a day can have more than one all-day time-off).
  public allDayTimeOffList: TimeOffOccurrence[] = [];

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
    this.renderTimeOffs();
  }

  public renderAppointments(): void {
    this.renderedAppointments = getRenderedAppointmentViews(this.date as Dayjs, this.timeFrom, this.timeTo, this.appointments, this.serviceColorsService, {
      crop: true,
      removeTopOverflow: true,
      layout: true
    });
  }

  public renderShadowAppointments(): void {
    this.renderedShadowAppointments = getRenderedAppointments(this.date as Dayjs, this.timeFrom, this.timeTo, this.shadowAppointments, this.serviceColorsService, {
      crop: true,
      removeTopOverflow: true,
    });
  }

  public renderTimeStatuses(): void {
    this.renderedTimeStatuses = [];

    if (this.freeTimes != null) {
      this.renderedTimeStatuses.push(...getRenderedIntervals(this.timeFrom, this.timeTo, this.freeTimes.map(f => {
        return { source: "free-time", time: f.from, duration: dayjs.duration(f.toIncludingDuration.valueOf() - f.from.valueOf()) };
      }), { crop: true }));

      let takenTimes = invertTimesCustom(this.freeTimes, t => t.from, t => t.toIncludingDuration, this.timeFrom, this.timeTo);
      this.renderedTimeStatuses.push(...getRenderedIntervals(this.timeFrom, this.timeTo, takenTimes.map(f => {
        return { source: "taken-time", time: f.from, duration: dayjs.duration(f.to.valueOf() - f.from.valueOf()) };
      }), { crop: true }));
    }

    if (this.workingHours != null) {
      let closedTimes = invertTimesCustom(this.workingHours, t => t.timeFrom as Dayjs, t => t.timeTo as Dayjs, this.timeFrom, this.timeTo);
      this.renderedTimeStatuses.push(...getRenderedIntervals(this.timeFrom, this.timeTo, closedTimes.map(f => {
        return { source: "closed-time", time: f.from, duration: dayjs.duration(f.to.valueOf() - f.from.valueOf()) };
      }), { crop: true }));
    }
  }

  public renderTimeOffs(): void {
    this.renderedTimeOffs = [];
    if (this.timeOffs == null) return;

    var partialOffs = this.timeOffs.filter(t => !t.isAllDay);
    var allDayOffs = this.timeOffs.filter(t => t.isAllDay);
    this.allDayTimeOffs = allDayOffs;

    var finalTimeOffs = [...partialOffs]
    if (allDayOffs.length > 0) {
      var allDayOffCopy = { ...allDayOffs[0] };

      if (allDayOffs.length > 1) {
        allDayOffCopy.label += " +" + (allDayOffs.length - 1);
      }
      finalTimeOffs.push(allDayOffCopy)
    }

    this.renderedTimeOffs = getRenderedIntervals(this.timeFrom, this.timeTo, finalTimeOffs.map(t => {
      let from = t.isAllDay ? this.timeFrom : (t.timeFrom as Dayjs);
      let to = t.isAllDay ? this.timeTo : (t.timeTo as Dayjs);
      return { source: t, time: from, duration: dayjs.duration(to.valueOf() - from.valueOf()) };
    }), { crop: true });
  }

  public renderCurrentTimeIndicator(): void {
    this.currentTimeIndicatorTop = ((dayjs().valueOf() - this.timeFrom.valueOf()) / (this.timeTo.valueOf() - this.timeFrom.valueOf())) * 100;
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

  onAppointmentClick(ap: AppointmentView) {
    this.viewAppointmentId = ap.id;
    this.appointmentDialog?.open();
  }

  closeAppointmentDialog() {
    this.viewAppointmentId = undefined;
    this.appointmentDialog?.close();
  }

  // Stable identity for the time-off bands so Angular reuses their DOM across re-renders (e.g. when
  // the scroller's adjacent-day prefetch re-emits inputs). Without it the *ngFor rebuilds every band,
  // detaching nodes mid-interaction — which both flakes clicks in tests and can drop a real user's
  // click during a background refresh. The all-day band is a single collapsed entry, hence one key.
  public trackTimeOff(_index: number, t: RenderedInterval<TimeOffOccurrence>): string {
    return (t.source.isAllDay ? "allDay" : "partial") + ":" + (t.source.id ?? "");
  }

  // Time-off band click: partial bands carry their own occurrence and open its details directly.
  // The all-day band is a collapsed view of every all-day off for the day — a single one opens its
  // details, several open a pick-list. Dialog refs are passed from the template, matching how the
  // list view drives the same dialogs.
  onTimeOffBandClick(occurrence: TimeOffOccurrence, detailsDialog: DialogComponent, listDialog: DialogComponent) {
    if (!occurrence.isAllDay) {
      this.viewTimeOffId = occurrence.id;
      detailsDialog.open();
      return;
    }

    if (this.allDayTimeOffs.length <= 1) {
      this.viewTimeOffId = this.allDayTimeOffs[0]?.id ?? occurrence.id;
      detailsDialog.open();
    } else {
      this.allDayTimeOffList = this.allDayTimeOffs;
      listDialog.open();
    }
  }
}