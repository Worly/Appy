import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import dayjs, { Dayjs } from 'dayjs';
import _ from 'lodash';
import { AppointmentView } from 'src/app/models/appointment';
import { AppointmentService } from '../../services/appointment.service';
import { appFilterToSmartFilter, AppointmentsFilter } from '../appointments/appointments.component';
import { PageableListDatasource } from 'src/app/shared/services/datasource';

@Component({
  selector: 'app-appointments-list',
  templateUrl: './appointments-list.component.html',
  styleUrls: ['./appointments-list.component.scss']
})
export class AppointmentsListComponent implements OnInit, OnDestroy {
  @ViewChildren("appointmentElement", { read: ElementRef }) appointmentElements?: QueryList<ElementRef<HTMLElement>>;
  @ViewChildren("dateElement") dateElements?: QueryList<ElementRef<HTMLElement>>;

  private _date: Dayjs = dayjs();
  @Input() set date(value: Dayjs) {
    if (this.date.isSame(value, "date"))
      return;

    this._date = value;
    this.startDate = value;
    this.load();

    this.dateChange.emit(value);
  }
  get date(): Dayjs {
    return this._date;
  }
  @Output() dateChange: EventEmitter<Dayjs> = new EventEmitter();

  private _filter: AppointmentsFilter = {};
  @Input() set filter(value: AppointmentsFilter) {
    if (_.isEqual(this._filter, value))
      return;

    this._filter = value;
    this.load();
  }

  private startDate: Dayjs = dayjs();

  private datasource?: PageableListDatasource<AppointmentView>;

  public appointments: AppointmentView[] | null = null;

  public renderedItems: (RenderedType & (RenderedAppointment | RenderedDate))[] = [];

  private keptScrollPosition: number | null = null;
  private keptScrollElement: (() => HTMLElement | undefined) | null = null;

  viewingAppointmentId: number | undefined;

  // While true, every render scrolls the viewport to startDate. Set by load() and cleared when
  // the user physically scrolls. Re-snapping on every render (not just the first) is needed
  // because two later events can drag the viewport away from startDate after the initial snap:
  // the auto-paginate-back triggered when snap lands near the top, and Angular's
  // scrollPositionRestoration scrolling to (0, 0) on forward navigation via its own setTimeout.
  private needsScrollToStartDate: boolean = false;

  // True only while the user is physically scrolling (wheel / touch drag / middle-button autoscroll).
  // updateDate() is gated on this so the date selector tracks the USER's position and is never
  // moved by a programmatic scroll. (URL writes from programmatic-scroll echoes would trigger
  // stale reloads.) The user-scroll listeners also clear needsScrollToStartDate so the snap loop
  // stops fighting the user's chosen position.
  private userScrolling: boolean = false;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private appointmentService: AppointmentService,
  ) { }

  ngOnInit(): void {
    if (this.date.isSame(dayjs(), "date"))
      this.load();
  }

  ngOnDestroy(): void {
    this.datasource?.dispose();
  }

  load() {
    this.datasource?.dispose();
    this.datasource = undefined;

    this.keptScrollElement = this.keptScrollPosition = null;
    this.needsScrollToStartDate = true;
    this.appointments = null;
    this.renderAppointments();

    this.datasource = this.appointmentService.getList(this.date, appFilterToSmartFilter(this._filter), appointmentSort);
    this.datasource.subscribe({
      next: a => {
        this.appointments = a;
        this.renderAppointments();

        setTimeout(() => this.checkShouldLoad());
      }
    })
  }

  private checkShouldLoad() {
    const scrollOffset = 100;

    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - scrollOffset && !this.datasource?.isReachedEndForwards()) {
      this.keepScroll();
      this.datasource?.loadNextPage();
      this.changeDetector.detectChanges();
      this.restoreScroll();
    }

    if (window.scrollY <= scrollOffset && !this.datasource?.isReachedEndBackwards()) {
      this.keepScroll();
      this.datasource?.loadPreviousPage();
      this.changeDetector.detectChanges();
      this.restoreScroll();
    }
  }

  // A real user scroll is always preceded by an input event (wheel, touch-drag, or a middle-button
  // press that starts autoscroll). Programmatic scrolls (scrollIntoView, scrollTo) are not.
  @HostListener('window:wheel')
  @HostListener('window:touchmove')
  onUserScrollInput() {
    this.userScrolling = true;
    this.needsScrollToStartDate = false;
  }

  @HostListener('window:mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    if (event.button === 1) {
      this.userScrolling = true;
      this.needsScrollToStartDate = false;
    }
  }

  @HostListener('window:scroll')
  onScroll() {
    this.checkShouldLoad();
    if (this.userScrolling)
      this.updateDate();
  }

  private keepScroll() {
    // Do NOT call detectChanges() here. We want to measure element positions against the
    // currently-rendered DOM (which may include a loading-more spinner). If we force a
    // detectChange before measuring, Angular would hide the spinner early (the datasource
    // sets isLoadingPrevious/Next to false before notifying subscribers), shifting all
    // element offsetTops by the spinner height before we have a chance to read them.
    // The single detectChanges() at the end of renderAppointments() atomically applies
    // both the spinner removal and the new items, so restoreScroll() gets the right reference.
    let firstVisibleApp = this.getFirstVisibleAppointmentElement();
    if (firstVisibleApp != null) {
      this.keptScrollPosition = firstVisibleApp.getBoundingClientRect().top;
      let id = this.getAppointmentElementId(firstVisibleApp) as number;
      this.keptScrollElement = () => this.getAppointmentElementWithId(id);
      return;
    }

    let firstVisibleDate = this.getFirstVisibleDateElement();
    if (firstVisibleDate != null) {
      this.keptScrollPosition = firstVisibleDate.getBoundingClientRect().top;
      let date = this.getDateElementDate(firstVisibleDate) as string;
      this.keptScrollElement = () => this.getDateElementWithDate(date);
      return;
    }

    this.keptScrollElement = this.keptScrollPosition = null;
  }

  private restoreScroll() {
    if (this.keptScrollElement == null || this.keptScrollPosition == null) {
      this.keptScrollElement = this.keptScrollPosition = null;
      return;
    }

    let element = this.keptScrollElement();
    if (element != null) {
      this.userScrolling = false;
      window.scrollTo({
        top: element.offsetTop - this.keptScrollPosition,
        behavior: "auto"
      });
    }

    this.keptScrollElement = this.keptScrollPosition = null;
  }

  private updateDate() {
    let date = this.getCurrentDate();
    if (date != null) {
      this._date = date;
      this.dateChange.next(date);
    }
  }

  private renderAppointments() {
    this.keepScroll();

    this.renderedItems = []

    if (this.appointments == null) {
      this.changeDetector.detectChanges();
      return;
    }

    let startDateItem: RenderedDate = {
      type: "date",
      dateFormatted: this.startDate.format("DD.MM.YYYY - dddd"),
      dateISO: this.startDate.format("YYYY-MM-DD"),
      isEmptyDate: true
    };

    var currentDate: Dayjs | null = null;

    var sortedAppointments = this.appointments.sort(appointmentSort)

    for (let i = 0; i < sortedAppointments.length; i++) {
      let ap = sortedAppointments[i];

      if (!ap.date?.isSame(currentDate)) {
        if (currentDate?.isBefore(this.startDate, "date") && ap.date?.isAfter(this.startDate, "date"))
          this.renderedItems.push(startDateItem);

        currentDate = ap.date as Dayjs;

        this.renderedItems.push({
          type: "date",
          dateFormatted: currentDate.format("DD.MM.YYYY - dddd"),
          dateISO: currentDate.format("YYYY-MM-DD"),
          isEmptyDate: false
        });
      }

      this.renderedItems.push({
        type: "appointment",
        id: ap.id,
        appointment: ap,
        dateISO: ap.date?.format("YYYY-MM-DD") ?? "",
        isLast: i == sortedAppointments.length - 1
      });
    }

    if (sortedAppointments.length == 0 || sortedAppointments[0].date?.isAfter(this.startDate, "date"))
      this.renderedItems.splice(0, 0, startDateItem);
    else if (sortedAppointments[sortedAppointments.length - 1].date?.isBefore(this.startDate, "date"))
      this.renderedItems.splice(this.renderedItems.length, 0, startDateItem);

    this.changeDetector.detectChanges();
    this.restoreScroll();

    if (this.needsScrollToStartDate)
      this.scrollToDate(this.startDate);
  }

  // Scrolls the viewport so the given date's header sits at the top. Programmatic, so it resets
  // userScrolling to stop the resulting async scroll echo from moving the date selector.
  private scrollToDate(date: Dayjs) {
    this.userScrolling = false;
    let element = this.getDateElementWithDate(date.format("YYYY-MM-DD"));
    element?.scrollIntoView({ block: 'start' });
  }

  isReachedBottom(): boolean {
    return this.datasource?.isReachedEndForwards() == true;
  }

  isReachedTop(): boolean {
    return this.datasource?.isReachedEndBackwards() == true;
  }

  isLoadingNext(): boolean {
    return this.datasource?.isLoadingNext() == true;
  }

  isLoadingPrevious(): boolean {
    return this.datasource?.isLoadingPrevious() == true;
  }

  getFirstVisibleAppointmentElement(): HTMLElement | undefined {
    if (this.appointmentElements == null || this.appointmentElements.length == 0)
      return undefined;

    for (let i = 0; i < this.appointmentElements.length; i++) {
      let element = this.appointmentElements.get(i)?.nativeElement;
      if (element == null)
        continue;

      if (element.getBoundingClientRect().bottom - 50 > 0)
        return element;
    }

    return undefined;
  }

  getAppointmentElementWithId(id: number): HTMLElement | undefined {
    if (this.appointmentElements == null || this.appointmentElements.length == 0)
      return undefined;

    for (let i = 0; i < this.appointmentElements.length; i++) {
      let element = this.appointmentElements.get(i)?.nativeElement;
      if (element == null)
        continue;

      if (this.getAppointmentElementId(element) == id)
        return element;
    }

    return undefined;
  }

  getAppointmentElementId(element: HTMLElement): number | undefined {
    let elId = element.getAttribute("data-appId");
    if (elId != null)
      return parseInt(elId, 10);
    else
      return undefined;
  }

  getFirstVisibleDateElement(): HTMLElement | undefined {
    if (this.dateElements == null || this.dateElements.length == 0)
      return undefined;

    for (let i = 0; i < this.dateElements.length; i++) {
      let element = this.dateElements.get(i)?.nativeElement;
      if (element == null)
        continue;

      if (element.getBoundingClientRect().bottom - 50 > 0)
        return element;
    }

    return undefined;
  }

  getDateElementWithDate(date: string): HTMLElement | undefined {
    if (this.dateElements == null || this.dateElements.length == 0)
      return undefined;

    for (let i = 0; i < this.dateElements.length; i++) {
      let element = this.dateElements.get(i)?.nativeElement;
      if (element == null)
        continue;

      if (this.getDateElementDate(element) == date)
        return element;
    }

    return undefined;
  }

  getDateElementDate(element: HTMLElement): string | undefined {
    let date = element.getAttribute("data-date");
    if (date != null)
      return date;
    else
      return undefined;
  }

  getCurrentDate(): Dayjs | undefined {
    let firstVisibleAppointment = this.getFirstVisibleAppointmentElement();
    let firstVisibleDate = this.getFirstVisibleDateElement();
    if (firstVisibleAppointment == null && firstVisibleDate == null)
      return undefined;

    let date: string = "";

    if (firstVisibleAppointment == null)
      date = firstVisibleDate?.getAttribute("data-date") as string;
    else if (firstVisibleDate == null || firstVisibleAppointment.offsetTop < firstVisibleDate.offsetTop)
      date = firstVisibleAppointment.getAttribute("data-date") as string;
    else
      date = firstVisibleDate?.getAttribute("data-date") as string;

    return dayjs(date);
  }
}

function appointmentSort(a: AppointmentView, b: AppointmentView): number {
  let dateDiff = a.date?.diff(b.date, "date") as number;
  if (dateDiff != 0)
    return dateDiff;

  let timeDiff = (a.time?.unix() as number) - (b.time?.unix() as number);
  if (timeDiff != 0)
    return timeDiff;

  let durationDiff = (a.duration?.asMilliseconds() as number) - (b.duration?.asMilliseconds() as number);
  return durationDiff;
}

type RenderedType = {
  type: "appointment" | "date"
}

export type RenderedAppointment = {
  type: "appointment";
  id: number;
  dateISO: string;
  appointment: AppointmentView;
  isLast: boolean;
}

type RenderedDate = {
  type: "date";
  dateFormatted: string;
  dateISO: string;
  isEmptyDate: boolean;
}
