import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import dayjs, { Dayjs } from 'dayjs';

@Component({
  selector: 'app-date-selector',
  templateUrl: './date-selector.component.html',
  styleUrls: ['./date-selector.component.scss']
})
export class DateSelectorComponent implements OnInit {

  private _date: Dayjs = dayjs();
  @Input() set date(value: Dayjs) {
    // Ignore null/undefined so a not-yet-loaded value can't poison _date and crash
    // every later change-detection cycle (reading .isSame/.format on undefined).
    if (value == null || this._date.isSame(value))
      return;

    this._date = value;
    this.dateChange.emit(this._date);
  }
  get date(): Dayjs {
    return this._date;
  }

  @Input() compact: boolean = false;

  @Output() dateChange: EventEmitter<Dayjs> = new EventEmitter();

  constructor() { }

  ngOnInit(): void {
  }

}
