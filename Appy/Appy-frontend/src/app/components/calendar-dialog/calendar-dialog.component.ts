import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import dayjs, { Dayjs } from 'dayjs';
import { DialogComponent } from '../dialog/dialog.component';
import { CalendarTodayHeaderComponent } from './calendar-today-header/calendar-today-header.component';

@Component({
  selector: 'app-calendar-dialog',
  templateUrl: './calendar-dialog.component.html',
  styleUrls: ['./calendar-dialog.component.scss']
})
export class CalendarDialogComponent implements OnInit {

  @ViewChild(DialogComponent) dialogComponent?: DialogComponent; 

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

  @Output() dateChange: EventEmitter<Dayjs> = new EventEmitter();

  public calendarTodayHeaderComponent = CalendarTodayHeaderComponent;
  
  constructor() { }

  ngOnInit(): void {
  }

  public open(): void {
    this.dialogComponent?.open();
  }

  public close(): void {
    this.dialogComponent?.close();
  }
}
