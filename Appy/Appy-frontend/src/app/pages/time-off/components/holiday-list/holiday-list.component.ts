import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, ViewChild } from "@angular/core";
import { Subscription } from "rxjs";
import { TimeOffScope } from "src/app/models/time-off";
import { HolidayListItem } from "src/app/models/holiday";
import { DialogComponent } from "src/app/components/dialog/dialog.component";
import { PagedResult } from "src/app/shared/services/data/contracts";
import { HolidayService } from "../../services/holiday.service";
import { TranslateService } from "src/app/components/translate/translate.service";
import { TimeOffRowView, holidayRowView } from "../../time-off-display";

interface HolidayRow {
  holiday: HolidayListItem;
  view: TimeOffRowView;
}

// The Holidays tab's list: a forward-paginated, infinite-scrolling list of imported holidays for the
// current scope. A row opens the shared time-off details dialog (active/edited) or the removed-holiday
// view (removed). Emits (configure) from the empty-state CTA so the container opens the configure dialog.
@Component({
  selector: "app-holiday-list",
  templateUrl: "./holiday-list.component.html",
  styleUrls: ["./holiday-list.component.scss"],
})
export class HolidayListComponent implements OnChanges, OnDestroy {
  @Input() scope: TimeOffScope = "Active";
  @Output() configure: EventEmitter<void> = new EventEmitter();

  public holidayRows: HolidayRow[] = [];
  public loading: boolean = false;
  public loadingMore: boolean = false;
  public viewingId?: number;
  public viewingRemovedHolidayId?: number;

  @ViewChild("detailsDialog") detailsDialog?: DialogComponent;
  @ViewChild("removedHolidayDialog") removedHolidayDialog?: DialogComponent;

  private paged?: PagedResult<HolidayListItem, never>;
  private sub?: Subscription;

  constructor(
    private holidayService: HolidayService,
    private changeDetector: ChangeDetectorRef,
    private translateService: TranslateService,
  ) { }

  ngOnChanges(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  public get hasRows(): boolean {
    return this.holidayRows.length > 0;
  }

  public refresh(): void {
    this.load();
  }

  private load(): void {
    this.sub?.unsubscribe();
    this.holidayRows = [];
    this.loading = true;
    this.paged = this.holidayService.getList(this.scope);
    this.sub = new Subscription();
    this.sub.add(this.paged.items$.subscribe(items => {
      const tr = (k: string) => this.translateService.translate(k);
      const lang = this.translateService.getSelectedLanguageCode();
      this.holidayRows = items.map(h => ({ holiday: h, view: holidayRowView(h, tr, lang) }));
      setTimeout(() => this.checkShouldLoad());
    }));
    this.sub.add(this.paged.loading$.subscribe(l => this.loading = l));
    this.sub.add(this.paged.loadingForwards$.subscribe(l => this.loadingMore = l));
  }

  @HostListener("window:scroll")
  public checkShouldLoad(): void {
    const scrollOffset = 200;
    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - scrollOffset
        && this.paged?.hasMore("forwards")) {
      this.paged.loadMore("forwards");
      this.changeDetector.detectChanges();
    }
  }

  // A holiday with a linked TimeOff is just a time-off — open it by id like any other. A removed one
  // has no TimeOff, so it goes to the dedicated view that fetches it by ImportedHoliday id.
  public onHolidayRowClick(h: HolidayListItem): void {
    if (h.linkedTimeOffId != null) {
      this.viewingId = h.linkedTimeOffId;
      this.detailsDialog?.open();
    } else {
      this.viewingRemovedHolidayId = h.id;
      this.removedHolidayDialog?.open();
    }
  }
}
