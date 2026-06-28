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

  // When true, the displayed date is prefixed with its (localized) weekday, e.g. "Monday, 21.06.2026".
  @Input() showDayOfWeek: boolean = false;

  @Output() dateChange: EventEmitter<Dayjs> = new EventEmitter();

  constructor() { }

  ngOnInit(): void {
  }

  // Text shown on the date button; with showDayOfWeek the weekday is prefixed in the active locale's
  // own casing (capitalized in English, lowercase in Croatian — dayjs's localized weekday names).
  get displayText(): string {
    const dateFormat = this.compact ? "DD.MM.YY" : "DD.MM.YYYY";
    return this._date.format(this.showDayOfWeek ? `dddd, ${dateFormat}` : dateFormat);
  }

}
