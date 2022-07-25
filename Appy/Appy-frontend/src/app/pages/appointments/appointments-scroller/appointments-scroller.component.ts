import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import * as moment from 'moment';
import { Subscription } from 'rxjs';
import { Appointment } from 'src/app/models/appointment';
import { FreeTime } from 'src/app/models/free-time';
import { AppointmentService } from 'src/app/services/appointment.service.ts';

@Component({
  selector: 'app-appointments-scroller',
  templateUrl: './appointments-scroller.component.html',
  styleUrls: ['./appointments-scroller.component.scss']
})
export class AppointmentsScrollerComponent implements OnInit, OnDestroy {

  daysData: DayData[] = [];

  private _daysToShow: number = 1;
  @Input() set daysToShow(value: number) {
    if (this._daysToShow == value)
      return;

    this._daysToShow = value;
    this.recalculateDaysData();
  }
  get daysToShow(): number {
    return this._daysToShow;
  }

  private _date: moment.Moment = moment();
  @Input() set date(value: moment.Moment) {
    if (this.date.isSame(value, "date"))
      return;

    this._date = value;
    this.recalculateDaysData();

    this.dateChange.emit(value);
  }
  get date(): moment.Moment {
    return this._date;
  }
  @Output() dateChange: EventEmitter<moment.Moment> = new EventEmitter();

  @Input() showDateControls: boolean = false;

  @Input() shadowAppointments: Appointment[] = [];
  @Input() freeTimes: FreeTime[] | null = null;

  public timeFrom: moment.Moment = moment({ hours: 8 });
  public timeTo: moment.Moment = moment({ hours: 14 });

  constructor(
    private appointmentService: AppointmentService
  ) {
  }

  ngOnInit(): void {
    this.recalculateDaysData();
  }

  ngOnDestroy(): void {
    for (let data of this.daysData)
      data.subscription?.unsubscribe();
  }

  recalculateDaysData() {
    if (this.daysData.filter(d => d.show).length != this.daysToShow || !this.daysData.find(d => d.show)?.date?.isSame(this.date, "date")) {
      let newDaysData: DayData[] = [];

      let firstDate = this.date;
      let lastDate = this.date.clone().add({ days: this.daysToShow - 1 });

      let numberOfCachedDates = 2;

      let beginDate = firstDate.clone().add({ days: -numberOfCachedDates });
      let endDate = lastDate.clone().add({ days: numberOfCachedDates });

      var current = beginDate.clone();

      while (current.isSameOrBefore(endDate, "date")) {
        let data = this.daysData.find(d => d.date.isSame(current, "date"));

        if (data == null) {
          data = {
            date: current.clone(),
            appointments: null
          };

          data.subscription = this.appointmentService.getAll(current)
            .subscribe(a => {
              if (data != null)
                data.appointments = a;
            });
        }

        data.show = current.isSameOrAfter(firstDate) && current.isSameOrBefore(lastDate);

        newDaysData.push(data);

        current = current.clone().add({ days: 1 });
      }

      // unsubscribe old data
      for (let oldData of this.daysData) {
        if (newDaysData.findIndex(d => d.date == oldData.date) == -1)
          oldData.subscription?.unsubscribe();
      }

      this.daysData = newDaysData;
    }
  }

  getHeight(): string {
    return (this.timeTo.diff(this.timeFrom, "hours", true) / 8) * 100 + "vh";
  }

  onlyVisibleDataFilter(data: DayData): boolean {
    return data.show == true;
  }
}

type DayData = {
  date: moment.Moment;
  appointments: Appointment[] | null;
  show?: boolean;
  subscription?: Subscription;
}