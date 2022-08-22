import { Component, Input, OnInit } from '@angular/core';
import { Appointment } from 'src/app/models/appointment';
import { RenderedInterval } from 'src/app/utils/rendered-interval';

@Component({
  selector: 'app-time-button',
  templateUrl: './time-button.component.html',
  styleUrls: ['./time-button.component.scss']
})
export class TimeButtonComponent implements OnInit {

  @Input() data: TimeData = {
    time: 0,
    isWorkingHour: true,
    isFreeTime: true,
    isFreeTimeIncluding: true,
    renderedAppointments: []
  };

  @Input() containsSelection: boolean = false;
  @Input() selected: boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

}

export type TimeData = {
  time: number;
  isWorkingHour: boolean;
  isFreeTime: boolean;
  isFreeTimeIncluding: boolean;
  renderedAppointments: RenderedInterval<Appointment>[];
}
