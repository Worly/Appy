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

  @HostListener('window:scroll', ['$event']) // for window scroll events
  onScroll() {
    this.checkShouldLoad();
  }

  private checkShouldLoad() {
    const scrollOffset = 100;

    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - scrollOffset)
      this.datasource?.loadNextPage();

    if (window.scrollY <= scrollOffset)
      this.datasource?.loadPreviousPage();
  }

  private keepScroll() {
    let firstVisibleApp = this.getFirstVisibleAppointment();
    if (firstVisibleApp != null) {
      this.keptScrollPosition = firstVisibleApp.getBoundingClientRect().top;
      let id = this.getAppointmentId(firstVisibleApp) as number;
      this.keptScrollElement = () => this.getAppointmentWithId(id);
      return;
    }

    let firstVisibleDate = this.getFirstVisibleDate();
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

  private renderAppointments() {
    this.keepScroll();

    this.renderedItems = []

    if (this.appointments == null) {
      this.changeDetector.detectChanges();
      return;
    }

    let startDateItem: RenderedDate = {
      type: "date",
      dateFormatted: this.startDate.format("DD.MM.YYYY"),
      dateISO: this.startDate.format("YYYY-MM-DD"),
      isEmptyDate: true
    };

    var currentDate: Dayjs | null = null;

    var sortedAppointments = this.appointments.sort(appointmentSort)

    for (let ap of sortedAppointments) {
      if (!ap.date?.isSame(currentDate)) {
        if (currentDate?.isBefore(this.startDate, "date") && ap.date?.isAfter(this.startDate, "date"))
          this.renderedItems.push(startDateItem);

        currentDate = ap.date as Dayjs;

        this.renderedItems.push({
          type: "date",
          dateFormatted: currentDate.format("DD.MM.YYYY"),
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
      })
    }

    let startDateAddIndex: number | null = null;
    if (sortedAppointments.length == 0)
      startDateAddIndex = 0;
    else if (sortedAppointments[0].date?.isAfter(this.startDate, "date"))
      startDateAddIndex = 0;
    else if (sortedAppointments[sortedAppointments.length - 1].date?.isBefore(this.startDate, "date"))
      startDateAddIndex = this.renderedItems.length;

    if (startDateAddIndex != null)
      this.renderedItems.splice(startDateAddIndex, 0, startDateItem);

    // remove first element which is date, because it's duplicate because of sticky current date element
    if (startDateAddIndex != 0)
      this.renderedItems.splice(0, 1);

    this.changeDetector.detectChanges();
    this.restoreScroll();
  }

  isReachedBottom(): boolean {
    return this.datasource?.isReachedEndForwards() == true;
  }

  isReachedTop(): boolean {
    return this.datasource?.isReachedEndBackwards() == true;
  }

  getFirstVisibleAppointment(): HTMLElement | undefined {
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

  getFirstVisibleDate(): HTMLElement | undefined {
    if (this.dateElements == null || this.dateElements.length == 0)
      return undefined;

    for (let i = 0; i < this.dateElements.length; i++) {
      let element = this.dateElements.get(i)?.nativeElement;
      if (element == null)
        continue;

      if (element.getBoundingClientRect().bottom > 0)
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

  getAppointmentWithId(id: number): HTMLElement | undefined {
    if (this.appointmentElements == null || this.appointmentElements.length == 0)
      return undefined;

    for (let i = 0; i < this.appointmentElements.length; i++) {
      let element = this.appointmentElements.get(i)?.nativeElement;
      if (element == null)
        continue;

      if (this.getAppointmentId(element) == id)
        return element;
    }

    return undefined;
  }

  getAppointmentId(element: HTMLElement): number | undefined {
    let elId = element.getAttribute("data-appId");
    if (elId != null)
      return parseInt(elId, 10);
    else
      return undefined;
  }

  getCurrentDate(): Dayjs | undefined {
    let firstVisibleAppointment = this.getFirstVisibleAppointment();
    if (firstVisibleAppointment == null)
      return undefined;

    return dayjs(firstVisibleAppointment.getAttribute("data-date"));
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
}

type RenderedDate = {
  type: "date";
  dateFormatted: string;
  dateISO: string;
  isEmptyDate: boolean;
}