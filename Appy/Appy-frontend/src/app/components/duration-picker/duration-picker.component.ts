import { Component, EventEmitter, Input, OnChanges, OnInit, Output } from '@angular/core';
import { duration, Duration, utc } from 'moment';

@Component({
  selector: 'app-duration-picker',
  templateUrl: './duration-picker.component.html',
  styleUrls: ['./duration-picker.component.scss']
})
export class DurationPickerComponent implements OnInit, OnChanges {

  @Input() value?: Duration = duration(0);
  @Output() valueChange: EventEmitter<Duration> = new EventEmitter();

  @Input() includeZero: boolean = false;
  @Input() stepInMinutes: number = 5;
  @Input() numberOfChoices: number = 20;

  durations: Duration[] = [];

  constructor() { }

  ngOnInit(): void {

  }

  ngOnChanges(): void {
    this.calcDurations();
  }

  private calcDurations() {
    this.durations = [];
    let current = duration(0);
    let step = duration({
      minutes: this.stepInMinutes
    });

    if (!this.includeZero)
      current.add(step);

    for (let i = 0; i < this.numberOfChoices; i++) {
      this.durations.push(current);
      current = duration(current).add(step);
    }
  }

  formatDuration(duration?: Duration): string {
    return utc(duration?.asMilliseconds()).format("HH:mm");
  }

  selectDuration(duration: Duration) {
    this.value = duration;
    this.valueChange.emit(duration);
  }
}
