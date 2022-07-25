import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import * as moment from 'moment';
import { Appointment } from 'src/app/models/appointment';

@Component({
  selector: 'app-date-time-chooser',
  templateUrl: './date-time-chooser.component.html',
  styleUrls: ['./date-time-chooser.component.scss']
})
export class DateTimeChooserComponent implements OnInit {

  @Input() appointment?: Appointment;

  @Input() date: moment.Moment = moment();
  @Input() time: moment.Moment = moment({ hours: 8, minutes: 0 });

  @Output() finished: EventEmitter<DateTimeChooserResult> = new EventEmitter();

  minutes: number[] = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  hours: number[] = [8, 9, 10, 11, 12, 13];

  constructor() { }

  ngOnInit(): void {
  }

  selectHours(hours: number) {
    this.time = this.time.clone().hours(hours);
  }

  selectMinutes(hours: number) {
    this.time = this.time.clone().minutes(hours);
  }

  cancel() {
    this.finished.emit({
      ok: false
    });
  }

  ok() {
    this.finished.emit({
      date: this.date,
      time: this.time,
      ok: true
    });
  }
}

export type DateTimeChooserResult = {
  date?: moment.Moment;
  time?: moment.Moment;
  ok: boolean;
}
