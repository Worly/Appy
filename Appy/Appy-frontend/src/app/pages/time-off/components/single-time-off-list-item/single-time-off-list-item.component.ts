import { Component, EventEmitter, Input, Output } from "@angular/core";
import { TimeOff } from "src/app/models/time-off";
import { TranslateService } from "src/app/components/translate/translate.service";
import { timeOffScheduleText, timeOffTimeText } from "../../time-off-display";

@Component({
  selector: "app-single-time-off-list-item",
  templateUrl: "./single-time-off-list-item.component.html",
  styleUrls: ["./single-time-off-list-item.component.scss"],
})
export class SingleTimeOffListItemComponent {
  private _timeOff?: TimeOff;
  @Input() set timeOff(value: TimeOff) {
    this._timeOff = value;
    this.render();
  }
  get timeOff(): TimeOff {
    return this._timeOff!;
  }

  @Output() onOpenView: EventEmitter<void> = new EventEmitter();

  public label: string = "";
  public schedule: string = "";
  public time: string = "";

  constructor(private translateService: TranslateService) {}

  private render(): void {
    const t = this._timeOff;
    if (t == null) return;
    const tr = (k: string) => this.translateService.translate(k);
    this.label = t.label ?? "";
    this.schedule = timeOffScheduleText(t, tr);
    this.time = timeOffTimeText(t, tr);
  }
}
