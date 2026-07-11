import { ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { Location } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription, filter, take } from "rxjs";
import { setUrlParams } from "src/app/utils/dynamic-url-params";
import { TimeOffListType, TimeOffScope } from "src/app/models/time-off";
import { HolidayImportSettings, HolidayListItem, SupportedCountry } from "src/app/models/holiday";
import { SegmentedOption } from "src/app/components/segmented-control/segmented-control.component";
import { DialogComponent } from "src/app/components/dialog/dialog.component";
import { PagedResult } from "src/app/shared/services/data/contracts";
import { HolidayService } from "../../services/holiday.service";
import { TranslateService } from "src/app/components/translate/translate.service";
import { TimeOffRowView, holidayRowView } from "../../time-off-display";

type TimeOffTab = "OneOff" | "Recurring" | "Holidays";

interface HolidayRow {
  holiday: HolidayListItem;
  view: TimeOffRowView;
}

@Component({
  selector: "app-time-off",
  templateUrl: "./time-off.component.html",
  styleUrls: ["./time-off.component.scss"],
})
export class TimeOffComponent implements OnInit, OnDestroy {
  public activeTab: TimeOffTab = "OneOff";
  public scope: TimeOffScope = "Active";
  public viewingId?: number;

  public readonly tabOptions: SegmentedOption[] = [
    { value: "OneOff", label: "pages.time-off.ONE_OFF", icon: "calendar-day", dataTest: "time-off-tab-oneoff" },
    { value: "Recurring", label: "pages.time-off.RECURRING", icon: "arrows-rotate", dataTest: "time-off-tab-recurring" },
    { value: "Holidays", label: "pages.time-off.HOLIDAYS", icon: "umbrella-beach", dataTest: "time-off-tab-holidays" },
  ];

  public readonly scopeOptions: SegmentedOption[] = [
    { value: "Active", label: "pages.time-off.UPCOMING", icon: "arrow-right", dataTest: "time-off-scope-upcoming" },
    { value: "History", label: "pages.time-off.HISTORY", icon: "clock-rotate-left", dataTest: "time-off-scope-history" },
  ];

  // Holidays tab state
  public holidayRows: HolidayRow[] = [];
  public holidaysLoading: boolean = false;
  public holidaysLoadingMore: boolean = false;
  public viewingRemovedHolidayId?: number;
  private holidayPaged?: PagedResult<HolidayListItem, never>;
  private holidaySub?: Subscription;

  // Configure dialog state
  public settings?: HolidayImportSettings;
  public countries: SupportedCountry[] = [];
  public selectedCountryCode?: string;
  public savingSettings: boolean = false;

  @ViewChild("detailsDialog") detailsDialog?: DialogComponent;
  @ViewChild("removedHolidayDialog") removedHolidayDialog?: DialogComponent;
  @ViewChild("configureDialog") configureDialog?: DialogComponent;
  @ViewChild("confirmChangeDialog") confirmChangeDialog?: DialogComponent;

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private location: Location,
    private route: ActivatedRoute,
    private holidayService: HolidayService,
    private changeDetector: ChangeDetectorRef,
    private translateService: TranslateService,
  ) {}

  ngOnInit(): void {
    this.subs.push(this.route.queryParamMap.subscribe(params => {
      const tab = params.get("tab");
      this.activeTab = tab === "recurring" ? "Recurring" : tab === "holidays" ? "Holidays" : "OneOff";
      const scope = params.get("scope");
      this.scope = scope === "history" ? "History" : "Active";
      this.loadHolidaysIfNeeded();
    }));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.holidaySub?.unsubscribe();
  }

  public get listType(): TimeOffListType {
    return this.activeTab === "Recurring" ? "Recurring" : "OneOff";
  }

  public get isHolidays(): boolean {
    return this.activeTab === "Holidays";
  }

  public setTab(tab: TimeOffTab): void {
    this.activeTab = tab;
    this.updateUrl();
    this.loadHolidaysIfNeeded();
  }

  public setScope(scope: TimeOffScope): void {
    this.scope = scope;
    this.updateUrl();
    this.loadHolidaysIfNeeded();
  }

  private updateUrl(): void {
    setUrlParams(this.router, this.route, this.location, {
      tab: this.activeTab.toLowerCase(),
      scope: this.scope === "History" ? "history" : "upcoming",
    });
  }

  public addNew(): void {
    this.router.navigate(["/time-off/new"], {
      queryParams: { type: this.activeTab === "Recurring" ? "recurring" : "oneoff" },
    });
  }

  public loadHolidaysIfNeeded(): void {
    if (!this.isHolidays) return;
    this.holidaySub?.unsubscribe();
    this.holidayRows = [];
    this.holidaysLoading = true;
    this.holidayPaged = this.holidayService.getList(this.scope);
    this.holidaySub = new Subscription();
    this.holidaySub.add(this.holidayPaged.items$.subscribe(items => {
      const tr = (k: string) => this.translateService.translate(k);
      const lang = this.translateService.getSelectedLanguageCode();
      this.holidayRows = items.map(h => ({ holiday: h, view: holidayRowView(h, tr, lang) }));
      setTimeout(() => this.checkShouldLoad());
    }));
    this.holidaySub.add(this.holidayPaged.loading$.subscribe(l => this.holidaysLoading = l));
    this.holidaySub.add(this.holidayPaged.loadingForwards$.subscribe(l => this.holidaysLoadingMore = l));
  }

  @HostListener("window:scroll")
  public checkShouldLoad(): void {
    if (!this.isHolidays) return;
    const scrollOffset = 200;
    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - scrollOffset
        && this.holidayPaged?.hasMore("forwards")) {
      this.holidayPaged.loadMore("forwards");
      this.changeDetector.detectChanges();
    }
  }

  public countryDisplay = (c: SupportedCountry): string => c.countryCode + " - " + c.name;

  public configureAutoImport(): void {
    this.holidayService.getSettings().subscribe(s => {
      this.settings = s;
      this.selectedCountryCode = s.countryCode;
      this.holidayService.getSupportedCountries().data$
        .pipe(filter(cs => cs != null), take(1))
        .subscribe(cs => this.countries = cs ?? []);
      this.configureDialog?.open();
    });
  }

  public get selectedCountry(): SupportedCountry | undefined {
    return this.countries.find(c => c.countryCode === this.selectedCountryCode);
  }

  public confirmConfigure(): void {
    const changing = this.selectedCountryCode !== this.settings?.countryCode;
    const hasImported = this.holidayRows.length > 0;
    if (changing && hasImported && this.settings?.countryCode != null) {
      this.configureDialog?.close();
      this.confirmChangeDialog?.open();
      return;
    }
    this.saveSettings();
  }

  public saveSettings(): void {
    this.savingSettings = true;
    const settings = new HolidayImportSettings({ countryCode: this.selectedCountryCode });
    this.holidayService.saveSettings(settings).subscribe({
      next: () => {
        this.savingSettings = false;
        this.configureDialog?.close();
        this.confirmChangeDialog?.close();
        this.loadHolidaysIfNeeded();
      },
      error: () => { this.savingSettings = false; },
    });
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
