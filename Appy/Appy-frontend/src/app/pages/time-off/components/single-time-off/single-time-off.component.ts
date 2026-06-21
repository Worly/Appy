import { Component, EventEmitter, Input, OnDestroy, Output } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";
import { TimeOff } from "src/app/models/time-off";
import { TranslateService } from "src/app/components/translate/translate.service";
import { TimeOffService } from "../../services/time-off.service";
import { timeOffRecurringRangeText, timeOffScheduleText, timeOffTimeText } from "../../time-off-display";

@Component({
  selector: "app-single-time-off",
  templateUrl: "./single-time-off.component.html",
  styleUrls: ["./single-time-off.component.scss"],
})
export class SingleTimeOffComponent implements OnDestroy {
  private _id?: number;
  @Input() set id(value: number | undefined) {
    if (this._id === value) return;
    this._id = value;
    this.setDatasource(value);
  }
  get id(): number | undefined {
    return this._id;
  }

  @Output() onDone: EventEmitter<void> = new EventEmitter();

  public timeOff?: TimeOff;
  public isLoading: boolean = false;
  public schedule: string = "";
  public dateRange: string = "";
  public time: string = "";

  private sub?: Subscription;

  constructor(
    private timeOffService: TimeOffService,
    private translateService: TranslateService,
    private router: Router,
  ) {}

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private setDatasource(id: number | undefined): void {
    this.sub?.unsubscribe();
    this.timeOff = undefined;
    if (id == null) return;

    this.isLoading = true;
    this.sub = this.timeOffService.get(id).subscribe(t => {
      this.timeOff = t;
      const tr = (k: string) => this.translateService.translate(k);
      this.schedule = timeOffScheduleText(t, tr);
      this.dateRange = timeOffRecurringRangeText(t, tr);
      this.time = timeOffTimeText(t, tr);
      this.isLoading = false;
    });
  }

  public goToEdit(): void {
    if (this._id == null) return;
    this.router.navigate(["time-off", "edit", this._id]);
    this.onDone.next();
  }
}
