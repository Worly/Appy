import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import * as moment from 'moment';

@Component({
  selector: 'app-duration-picker',
  templateUrl: './duration-picker.component.html',
  styleUrls: ['./duration-picker.component.scss']
})
export class DurationPickerComponent implements OnInit, OnChanges {

  @Input() value?: moment.Duration = moment.duration(0);
  @Output() valueChange: EventEmitter<moment.Duration> = new EventEmitter();

  @Input() includeZero: boolean = false;
  @Input() stepInMinutes: number = 5;
  @Input() numberOfChoices: number = 20;

  durations: moment.Duration[] = [];

  constructor() { }

  ngOnInit(): void {

  }

  ngOnChanges(): void {
    this.calcDurations();
  }

  private calcDurations() {
    this.durations = [];
    let current = moment.duration(0);
    let step = moment.duration({
      minutes: this.stepInMinutes
    });

    if (!this.includeZero)
      current.add(step);

    for (let i = 0; i < this.numberOfChoices; i++) {
      this.durations.push(current);
      current = moment.duration(current).add(step);
    }
  }

  formatDuration(duration?: moment.Duration): string {
    return moment.utc(duration?.asMilliseconds()).format("HH:mm");
  }

  selectDuration(duration: moment.Duration) {
    this.value = duration;
    this.valueChange.emit(duration);
  }
}
