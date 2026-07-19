import { Component, OnDestroy, OnInit, ViewChild } from "@angular/core";
import { Location } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { setUrlParams } from "src/app/utils/dynamic-url-params";
import { TimeOffListType, TimeOffScope } from "src/app/models/time-off";
import { SegmentedOption } from "src/app/components/segmented-control/segmented-control.component";
import { HolidayListComponent } from "../holiday-list/holiday-list.component";
import { HolidayConfigureDialogComponent } from "../holiday-configure-dialog/holiday-configure-dialog.component";

type TimeOffTab = "OneOff" | "Recurring" | "Holidays";

@Component({
  selector: "app-time-off",
  templateUrl: "./time-off.component.html",
  styleUrls: ["./time-off.component.scss"],
})
export class TimeOffComponent implements OnInit, OnDestroy {
  public activeTab: TimeOffTab = "OneOff";
  public scope: TimeOffScope = "Active";
  public viewingId?: number;

  @ViewChild(HolidayListComponent) private holidayList?: HolidayListComponent;
  @ViewChild(HolidayConfigureDialogComponent) private configureDialog?: HolidayConfigureDialogComponent;

  public readonly tabOptions: SegmentedOption[] = [
    { value: "OneOff", label: "pages.time-off.ONE_OFF", icon: "calendar-day", dataTest: "time-off-tab-oneoff" },
    { value: "Recurring", label: "pages.time-off.RECURRING", icon: "arrows-rotate", dataTest: "time-off-tab-recurring" },
    { value: "Holidays", label: "pages.time-off.HOLIDAYS", icon: "umbrella-beach", dataTest: "time-off-tab-holidays" },
  ];

  public readonly scopeOptions: SegmentedOption[] = [
    { value: "Active", label: "pages.time-off.UPCOMING", icon: "arrow-right", dataTest: "time-off-scope-upcoming" },
    { value: "History", label: "pages.time-off.HISTORY", icon: "clock-rotate-left", dataTest: "time-off-scope-history" },
  ];

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private location: Location,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.subs.push(this.route.queryParamMap.subscribe(params => {
      const tab = params.get("tab");
      this.activeTab = tab === "recurring" ? "Recurring" : tab === "holidays" ? "Holidays" : "OneOff";
      const scope = params.get("scope");
      this.scope = scope === "history" ? "History" : "Active";
    }));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
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
  }

  public setScope(scope: TimeOffScope): void {
    this.scope = scope;
    this.updateUrl();
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

  // The configure dialog needs to know whether importing would discard existing holidays; the holiday
  // list owns that count, so hand it over at open time.
  public openConfigure(): void {
    if (this.configureDialog == null) return;
    this.configureDialog.hasImportedHolidays = this.holidayList?.hasRows ?? false;
    this.configureDialog.open();
  }

  public onSettingsSaved(): void {
    this.holidayList?.refresh();
  }
}
