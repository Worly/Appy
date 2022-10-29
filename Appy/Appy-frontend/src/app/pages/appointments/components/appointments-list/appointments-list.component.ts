import { ChangeDetectorRef, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import dayjs, { Dayjs } from 'dayjs';
import { Duration } from 'dayjs/plugin/duration';
import { DialogComponent } from 'src/app/components/dialog/dialog.component';
import { Appointment } from 'src/app/models/appointment';
import { ServiceColorsService } from 'src/app/pages/services/services/service-colors.service';
import { PageableListDatasource } from 'src/app/shared/services/base-model-service';
import { AppointmentService } from '../../services/appointment.service.ts';

@Component({
  selector: 'app-appointments-list',
  templateUrl: './appointments-list.component.html',
  styleUrls: ['./appointments-list.component.scss']
})
export class AppointmentsListComponent implements OnInit, OnDestroy {

  @ViewChild("appointmentDialog", { read: DialogComponent }) appointmentDialog?: DialogComponent;
  @ViewChildren("appointmentElement") appointmentElements?: QueryList<ElementRef<HTMLElement>>;
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

  private startDate: Dayjs = dayjs();

  private datasource?: PageableListDatasource<Appointment>;

  public appointments: Appointment[] | null = null;

  public renderedItems: (RenderedType & (RenderedAppointment | RenderedDate))[] = [];

  viewAppointmentId?: number;
  keptScrollPosition: number | null = null;
  keptScrollElement: (() => HTMLElement | undefined) | null = null;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private appointmentService: AppointmentService,
    private serviceColorsService: ServiceColorsService,
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
    this.appointments = null;
    this.renderAppointments();

    this.datasource = this.appointmentService.getList(this.date, appointmentSort);
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

  @HostListener('window:scroll', ['$event']) // for window scroll events
  onScroll() {
    this.checkShouldLoad();
    this.updateDate();
  }

  private keepScroll() {
    this.changeDetector.detectChanges();
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
      window.scrollTo({
        top: element.offsetTop - this.keptScrollPosition,
        behavior: "auto"
      })
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
        time: `${ap.time?.format("HH:mm")} - ${ap.time?.add(ap.duration as Duration).format("HH:mm")}`,
        service: ap.service?.displayName as string,
        serviceColor: this.serviceColorsService.get(ap.service?.colorId),
        client: ap.client?.nickname as string,
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

  //#region AppointmentElements
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
  //#endregion

  //#region DateElements
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
  //#endregion

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

  onAppointmentClick(apId: number) {
    this.viewAppointmentId = apId;
    this.appointmentDialog?.open();
  }

  closeAppointmentDialog() {
    this.viewAppointmentId = undefined;
    this.appointmentDialog?.close();
  }
}

function appointmentSort(a: Appointment, b: Appointment): number {
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
  time: string;
  service: string;
  serviceColor: string;
  client: string;
  dateISO: string;
  isLast: boolean;
}

type RenderedDate = {
  type: "date";
  dateFormatted: string;
  dateISO: string;
  isEmptyDate: boolean;
}