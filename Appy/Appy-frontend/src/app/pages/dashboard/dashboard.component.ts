import { Component, OnDestroy, OnInit } from '@angular/core';
import { DashboardSettings } from 'src/app/models/dashboard-settings';
import { DashboardService } from './services/dashboard.service';
import { Subscription } from 'rxjs';
import { ToastService } from 'src/app/components/toast/toast.service';
import { TranslateService } from 'src/app/components/translate/translate.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, OnDestroy {
  settings?: DashboardSettings;

  private subs: Subscription[] = []

  constructor(
    private dashboardService: DashboardService, 
    private toastService: ToastService,
    private translateService: TranslateService
  ) { }

  ngOnInit(): void {
    this.subs.push(this.dashboardService.getSettings().subscribe(s => this.settings = s));
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  saveSettings() {
    if (this.settings == null)
      return

    this.subs.push(this.dashboardService.saveSettings(this.settings).subscribe({
      next: s => {
        this.settings = s;

        this.toastService.show({
          text: this.translateService.translate("SETTINGS_SAVED"),
          icon: ["far", "circle-check"],
          iconColor: "success",
        })
      }
    }));
  }
}
