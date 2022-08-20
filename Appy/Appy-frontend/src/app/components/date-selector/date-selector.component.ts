import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import dayjs, { Dayjs } from 'dayjs';
import { CalendarTodayHeaderComponent } from '../calendar-today-header/calendar-today-header.component';

@Component({
  selector: 'app-date-selector',
  templateUrl: './date-selector.component.html',
  styleUrls: ['./date-selector.component.scss']
})
export class DateSelectorComponent implements OnInit {

  private _date: Dayjs = dayjs();
  @Input() set date(value: Dayjs) {
    if (this._date.isSame(value))
      return;

    this._date = value;
    this.dateChange.emit(this._date);
  }
  get date(): Dayjs {
    return this._date;
  }

  @Input() compact: boolean = false;

  @Output() dateChange: EventEmitter<Dayjs> = new EventEmitter();

  public calendarTodayHeaderComponent = CalendarTodayHeaderComponent;

  constructor() { }

  ngOnInit(): void {
  }

}
