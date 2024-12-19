import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ClientNotificationsSettings } from 'src/app/models/client-notifications-settings';
import { ClientNotificationsService } from '../../services/client-notifications.service';
import { Location } from '@angular/common';

@Component({
  selector: 'app-client-notifications-settings',
  templateUrl: './client-notifications-settings.component.html',
  styleUrls: ['./client-notifications-settings.component.scss']
})
export class ClientNotificationsSettingsComponent implements OnInit {
  public settings?: ClientNotificationsSettings;

  public isLoading: boolean = false;

  private subs: Subscription[] = [];

  constructor(
    private location: Location,
    private clientNotificationsService: ClientNotificationsService,
  ) { }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private load() {
    this.subs.push(this.clientNotificationsService.getSettings().subscribe((settings: ClientNotificationsSettings) => {
      this.settings = settings;
    }));
  }

  public cancel() {
    this.goBack();
  }

  public save() {
    if (this.settings == null)
      return;

    this.isLoading = true;

    this.subs.push(this.clientNotificationsService.updateSettings(this.settings).subscribe({
      next: () => this.goBack(),
      error: (e: any) => this.isLoading = false
    }));
  }

  public goBack() {
    this.location.back();
  }
}
