import { Component, OnDestroy, OnInit } from "@angular/core";
import { Location } from "@angular/common";
import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";
import { setUrlParams } from "src/app/utils/dynamic-url-params";
import { TimeOffListType, TimeOffScope } from "src/app/models/time-off";

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

  public readonly tabs: { tab: TimeOffTab; labelKey: string }[] = [
    { tab: "OneOff", labelKey: "pages.time-off.ONE_OFF" },
    { tab: "Recurring", labelKey: "pages.time-off.RECURRING" },
    { tab: "Holidays", labelKey: "pages.time-off.HOLIDAYS" },
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
      this.scope = scope === "past" ? "Expired" : "Active";
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
      scope: this.scope === "Expired" ? "past" : "upcoming",
    });
  }

  public addNew(): void {
    this.router.navigate(["/time-off/new"], {
      queryParams: { type: this.activeTab === "Recurring" ? "recurring" : "oneoff" },
    });
  }

  // Placeholder for the upcoming holiday auto-import feature. The Holidays-tab button is wired here so
  // the UI is in place; it does nothing until the import backend exists.
  public configureAutoImport(): void {
  }
}
