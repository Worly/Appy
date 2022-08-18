import { Component, EventEmitter, Input, OnChanges, OnInit, Output, QueryList, ViewChild, ViewChildren } from '@angular/core';
import dayjs from "dayjs";
import { Duration } from 'dayjs/plugin/duration';
import { ButtonComponent } from '../button/button.component';
import { ContextMenuComponent } from '../context-menu/context-menu.component';

@Component({
  selector: 'app-duration-picker',
  templateUrl: './duration-picker.component.html',
  styleUrls: ['./duration-picker.component.scss']
})
export class DurationPickerComponent implements OnInit, OnChanges {

  @ViewChild("contextMenu", { read: ContextMenuComponent }) contextMenu?: ContextMenuComponent;
  @ViewChildren("contextMenuButtons", { read: ButtonComponent }) buttons?: QueryList<ButtonComponent>;

  @Input() value?: Duration = dayjs.duration(0);
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
    let current = dayjs.duration(0);
    let step = dayjs.duration({
      minutes: this.stepInMinutes
    });

    if (!this.includeZero)
      current = current.add(step);

    for (let i = 0; i < this.numberOfChoices; i++) {
      this.durations.push(current);
      current = current.add(step);
    }
  }

  selectDuration(duration: Duration) {
    this.value = duration;
    this.valueChange.emit(duration);
  }

  buttonClicked() {
    this.contextMenu?.toggle();

    // scroll selected into view
    if (this.value == null)
      return;

    if (this.contextMenu?.isOpen() && this.buttons != null) {
      let selectedButton = this.buttons.find(b => b.text == this.value?.format("HH:mm"));
      if (selectedButton == null)
        return;

      let buttonElement = selectedButton.elementRef.nativeElement as HTMLElement;
      let parentElement = buttonElement.parentElement as HTMLElement;

      let scrollPosition = buttonElement.getBoundingClientRect().top;

      parentElement.scrollTop = scrollPosition - 80;

      parentElement.scrollTo({
        top: scrollPosition,
        behavior: "smooth"
      });
    }
  }
}
