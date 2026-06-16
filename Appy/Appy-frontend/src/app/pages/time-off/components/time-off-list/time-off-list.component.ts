import { ChangeDetectorRef, Component, EventEmitter, HostListener, Input, OnChanges, OnDestroy, Output, SimpleChanges } from "@angular/core";
import { Subscription } from "rxjs";
import { TimeOff, TimeOffListType, TimeOffScope } from "src/app/models/time-off";
import { PagedResult } from "src/app/shared/services/data/contracts";
import { TimeOffService } from "../../services/time-off.service";

@Component({
  selector: "app-time-off-list",
  templateUrl: "./time-off-list.component.html",
  styleUrls: ["./time-off-list.component.scss"],
})
export class TimeOffListComponent implements OnChanges, OnDestroy {
  @Input() type!: TimeOffListType;
  @Input() scope!: TimeOffScope;
  @Output() openDetails: EventEmitter<number> = new EventEmitter();

  public items: TimeOff[] | null = null;
  public loadingMore: boolean = false;

  private pagedResult?: PagedResult<TimeOff, never>;
  private subs: Subscription[] = [];

  constructor(
    private timeOffService: TimeOffService,
    private changeDetector: ChangeDetectorRef,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["type"] || changes["scope"]) this.load();
  }

  ngOnDestroy(): void {
    this.teardown();
  }

  private teardown(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
  }

  private load(): void {
    this.teardown();
    this.items = null;
    this.pagedResult = this.timeOffService.getList(this.type, this.scope);

    this.subs.push(this.pagedResult.items$.subscribe(items => {
      this.items = items;
      // After a render, top up if the first page didn't fill the viewport.
      setTimeout(() => this.checkShouldLoad());
    }));
    this.subs.push(this.pagedResult.loadingForwards$.subscribe(l => this.loadingMore = l));
  }

  @HostListener("window:scroll")
  public checkShouldLoad(): void {
    const scrollOffset = 200;
    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - scrollOffset && this.pagedResult?.hasMore("forwards")) {
      this.pagedResult.loadMore("forwards");
      this.changeDetector.detectChanges();
    }
  }
}
