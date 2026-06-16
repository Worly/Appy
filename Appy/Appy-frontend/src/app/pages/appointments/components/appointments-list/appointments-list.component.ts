import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, QueryList, ViewChildren } from '@angular/core';
import dayjs, { Dayjs } from 'dayjs';
import { Duration } from 'dayjs/plugin/duration';
import { timeBetweenMs } from 'src/app/utils/time-utils';
import _ from 'lodash';
import { Subscription, filter, combineLatest } from 'rxjs';
import { Router, Scroll } from '@angular/router';
import { AppointmentView } from 'src/app/models/appointment';
import { AppointmentService } from '../../services/appointment.service';
import { appFilterToSmartFilter, AppointmentsFilter } from '../appointments/appointments.component';
import { PagedResult } from 'src/app/shared/services/data/contracts';
import { TimeOffOccurrence } from 'src/app/models/time-off-occurrence';
import { buildDayTimeline, TimelineEntry } from 'src/app/utils/list-timeline';

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

  private pagedResult?: PagedResult<AppointmentView, TimeOffOccurrence>;
  private pagedSubs: Subscription[] = [];

  // Component-lifetime subscriptions (router events), torn down in ngOnDestroy.
  private subs: Subscription[] = [];

  // Synchronous mirrors of PagedResult.loadingForwards$/loadingBackwards$, read by the
  // template (isLoadingNext/isLoadingPrevious) to place the bottom/top spinner.
  private loadingForwards: boolean = false;
  private loadingBackwards: boolean = false;

  public appointments: AppointmentView[] | null = null;

  public timeOffs: TimeOffOccurrence[] = [];

  public renderedItems: (RenderedType & (RenderedAppointment | RenderedDate | RenderedGap | RenderedTimeOff))[] = [];

  private keptScrollPosition: number | null = null;
  private keptScrollElement: (() => HTMLElement | undefined) | null = null;

  viewingAppointmentId: number | undefined;
  viewingTimeOffId: number | undefined;

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
    private router: Router,
  ) { }

  ngOnInit(): void {
    if (this.date.isSame(dayjs(), "date"))
      this.load();

    // scrollPositionRestoration ('enabled') scrolls this forward navigation to (0, 0) on a
    // deferred tick after the route renders. On a warm-cache revisit the list paints from cache
    // and snaps to startDate before that (0, 0) lands, and the next render (the background refetch)
    // can be seconds away on a slow network — so without this nothing re-snaps and the viewport
    // sits at the top until the refetch arrives. Re-assert the snap once the router has emitted its
    // Scroll event, deferred via setTimeout so we run after the router's own (later-queued) scroll.
    this.subs.push(this.router.events.pipe(filter((e): e is Scroll => e instanceof Scroll)).subscribe(() => {
      if (!this.needsScrollToStartDate || this.userScrolling)
        return;
      setTimeout(() => {
        if (this.needsScrollToStartDate && !this.userScrolling)
          this.scrollToDate(this.startDate);
      });
    }));
  }

  ngOnDestroy(): void {
    this.pagedSubs.forEach(s => s.unsubscribe());
    this.subs.forEach(s => s.unsubscribe());
  }

  load() {
    this.pagedSubs.forEach(s => s.unsubscribe());
    this.pagedSubs = [];

    this.keptScrollElement = this.keptScrollPosition = null;
    this.needsScrollToStartDate = true;
    this.loadingForwards = this.loadingBackwards = false;
    this.appointments = null;
    this.timeOffs = [];
    this.renderAppointments();

    this.pagedResult = this.appointmentService.getList(this.date, appFilterToSmartFilter(this._filter));

    // Appointments and their time-offs arrive in the same paged response (items$ + extras$ are
    // projections of one query), so combine them and render once — no separate fetch, no pop-in.
    this.pagedSubs.push(combineLatest([this.pagedResult.items$, this.pagedResult.extras$]).subscribe(([appointments, timeOffs]) => {
      this.appointments = appointments;
      this.timeOffs = this.dedupeOccurrences(timeOffs);
      this.renderAppointments();

      setTimeout(() => this.checkShouldLoad());
    }));

    this.pagedSubs.push(this.pagedResult.loadingForwards$.subscribe(l => this.loadingForwards = l));
    this.pagedSubs.push(this.pagedResult.loadingBackwards$.subscribe(l => this.loadingBackwards = l));
  }

  // A page-boundary date can appear at the tail of one page and the head of the next, so the same
  // occurrence may arrive twice across pages. Dedupe by (rule id, date).
  private dedupeOccurrences(occurrences: TimeOffOccurrence[]): TimeOffOccurrence[] {
    let seen = new Set<string>();
    let result: TimeOffOccurrence[] = [];
    for (let o of occurrences) {
      let key = `${o.id}|${o.date?.format("YYYY-MM-DD")}`;
      if (seen.has(key))
        continue;
      seen.add(key);
      result.push(o);
    }
    return result;
  }

  private checkShouldLoad() {
    const scrollOffset = 100;

    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - scrollOffset && this.pagedResult?.hasMore("forwards")) {
      this.keepScroll();
      this.pagedResult?.loadMore("forwards");
      this.changeDetector.detectChanges();
      this.restoreScroll();
    }

    if (window.scrollY <= scrollOffset && this.pagedResult?.hasMore("backwards")) {
      this.keepScroll();
      this.pagedResult?.loadMore("backwards");
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
      date: this.startDate,
      dateFormatted: this.startDate.format("DD.MM.YYYY - dddd"),
      dateISO: this.startDate.format("YYYY-MM-DD"),
      isEmptyDate: true,
      allDayOccurrences: [],
    };

    let sorted = this.appointments.sort(appointmentSort);

    // Group appointments by date (preserving sorted order of dates). The list is
    // appointment-driven: a date divider is emitted ONLY for days that have at least one
    // appointment. Days with only time-off never appear.
    let dayKeys: string[] = [];
    let byDate = new Map<string, { date: Dayjs, appointments: AppointmentView[] }>();
    for (let ap of sorted) {
      let key = ap.date?.format("YYYY-MM-DD") ?? "";
      if (!byDate.has(key)) {
        byDate.set(key, { date: ap.date as Dayjs, appointments: [] });
        dayKeys.push(key);
      }
      byDate.get(key)!.appointments.push(ap);
    }

    let startInserted = false;
    let prevDate: Dayjs | null = null;

    for (let k = 0; k < dayKeys.length; k++) {
      let day = byDate.get(dayKeys[k])!;

      // Insert the empty start-date divider when crossing over startDate between two days.
      if (!startInserted && prevDate?.isBefore(this.startDate, "date") && day.date.isAfter(this.startDate, "date")) {
        this.renderedItems.push(startDateItem);
        startInserted = true;
      }

      let dayOccurrences = this.timeOffs.filter(o => o.date?.isSame(day.date, "date"));
      let allDayOccurrences = dayOccurrences.filter(o => o.isAllDay);

      this.renderedItems.push({
        type: "date",
        date: day.date,
        dateFormatted: day.date.format("DD.MM.YYYY - dddd"),
        dateISO: day.date.format("YYYY-MM-DD"),
        isEmptyDate: false,
        allDayOccurrences,
      });

      // Merge appointments + partial offs, then walk emitting gaps and items.
      let timeline = buildDayTimeline(day.appointments, dayOccurrences);
      let prevEntry: TimelineEntry | null = null;
      let prevRenderedCardItem: RenderedCardItem | null = null;

      for (let i = 0; i < timeline.length; i++) {
        let entry = timeline[i];

        let isOverlappingWithPrev = false;
        if (prevEntry != null) {
          let ms = timeBetweenMs(prevEntry.start, prevEntry.duration, entry.start, entry.duration);
          if (ms !== 0) {
            isOverlappingWithPrev = ms < 0;
            this.renderedItems.push({ type: "gap", duration: dayjs.duration(Math.abs(ms)), isOverlap: isOverlappingWithPrev });
            // Retroactively flag the previous appointment card too — it's the same object
            // already in renderedItems, so mutating it here updates the rendered entry in place.
            if (isOverlappingWithPrev && prevRenderedCardItem != null)
              prevRenderedCardItem.isOverlapping = true;
          }
        }

        if (entry.kind === "appointment") {
          let item: RenderedAppointment = {
            type: "appointment",
            id: entry.appointment.id,
            appointment: entry.appointment,
            dateISO: day.date.format("YYYY-MM-DD"),
            isLast: k === dayKeys.length - 1 && i === timeline.length - 1,
            isOverlapping: isOverlappingWithPrev,
          };
          this.renderedItems.push(item);
          prevRenderedCardItem = item;
        }
        else if (entry.kind == "timeoff") {
          let item: RenderedTimeOff = {
            type: "timeoff", 
            occurrence: entry.occurrence, 
            isOverlapping: isOverlappingWithPrev
          }
          this.renderedItems.push(item);
          prevRenderedCardItem = item;
        }

        prevEntry = entry;
      }

      prevDate = day.date;
    }

    // Empty / boundary start-date divider (same rules as before, day-grouped).
    if (!startInserted) {
      if (dayKeys.length === 0 || byDate.get(dayKeys[0])!.date.isAfter(this.startDate, "date"))
        this.renderedItems.splice(0, 0, startDateItem);
      else if (byDate.get(dayKeys[dayKeys.length - 1])!.date.isBefore(this.startDate, "date"))
        this.renderedItems.splice(this.renderedItems.length, 0, startDateItem);
    }

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
    return this.pagedResult != null && !this.pagedResult.hasMore("forwards");
  }

  isReachedTop(): boolean {
    return this.pagedResult != null && !this.pagedResult.hasMore("backwards");
  }

  isLoadingNext(): boolean {
    return this.loadingForwards;
  }

  isLoadingPrevious(): boolean {
    return this.loadingBackwards;
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
  type: "appointment" | "date" | "gap" | "timeoff"
}

type RenderedCardItem = {
  isOverlapping: boolean;
}

export type RenderedAppointment = RenderedCardItem & {
  type: "appointment";
  id: number;
  dateISO: string;
  appointment: AppointmentView;
  isLast: boolean;
}

type RenderedDate = {
  type: "date";
  date: Dayjs;
  dateFormatted: string;
  dateISO: string;
  isEmptyDate: boolean;
  allDayOccurrences: TimeOffOccurrence[];   // whole-day time-off occurrences for this date
}

type RenderedGap = {
  type: "gap";
  duration: Duration;   // always positive; magnitude of the interval
  isOverlap: boolean;
}

export type RenderedTimeOff = RenderedCardItem & {
  type: "timeoff";
  occurrence: TimeOffOccurrence;
}
