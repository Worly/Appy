import { Component, EventEmitter, Input, OnDestroy, Output } from "@angular/core";
import { Subscription, filter, take } from "rxjs";
import { Holiday } from "src/app/models/holiday";
import { TimeOff } from "src/app/models/time-off";
import { TranslateService } from "src/app/components/translate/translate.service";
import { NotifyDialogService } from "src/app/components/notify-dialog/notify-dialog.service";
import { HolidayService } from "../../services/holiday.service";
import { holidayAsTimeOff } from "../../time-off-display";

// Details view for a removed holiday — the one holiday that has no linked TimeOff, so it can't be
// loaded by id like every other time-off. Fetches the full holiday by its ImportedHoliday id and
// offers only Restore.
@Component({
  selector: "app-removed-holiday",
  templateUrl: "./removed-holiday.component.html",
  styleUrls: ["./removed-holiday.component.scss"],
})
export class RemovedHolidayComponent implements OnDestroy {
  private _importedHolidayId?: number;
  @Input() set importedHolidayId(value: number | undefined) {
    if (this._importedHolidayId === value) return;
    this._importedHolidayId = value;
    this.load(value);
  }
  get importedHolidayId(): number | undefined {
    return this._importedHolidayId;
  }

  @Output() onDone: EventEmitter<void> = new EventEmitter();
  @Output() onChanged: EventEmitter<void> = new EventEmitter();

  public holiday?: Holiday;
  public isLoading: boolean = false;
  // A removed holiday reverts to its original all-day date — projected onto a one-off for the card.
  public timeOff?: TimeOff;

  private sub?: Subscription;

  constructor(
    private holidayService: HolidayService,
    private translateService: TranslateService,
    private notifyDialogService: NotifyDialogService,
  ) { }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private load(id: number | undefined): void {
    this.sub?.unsubscribe();
    this.holiday = undefined;
    if (id == null) return;

    this.isLoading = true;
    this.sub = this.holidayService.getById(id).data$
      .pipe(filter((h): h is Holiday => h != null), take(1))
      .subscribe(h => {
        this.holiday = h;
        this.timeOff = holidayAsTimeOff({ date: h.date, isAllDay: true });
        this.isLoading = false;
      });
  }

  public openRestoreDialog(): void {
    this.notifyDialogService
      .yesNoDialog(this.translateService.translate("pages.time-off.RESTORE_CONFIRM"), { confirmDataTest: "holiday-restore-confirm" })
      .subscribe((ok: boolean) => {
        if (!ok || this.holiday == null) return;
        this.holidayService.restore(this.holiday.id).subscribe(() => {
          this.onChanged.next();
          this.onDone.next();
        });
      });
  }
}
