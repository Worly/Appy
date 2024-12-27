import { Component, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ClientNotificationsSettings } from 'src/app/models/client-notifications-settings';
import { ClientNotificationsService } from '../../services/client-notifications.service';
import { Location } from '@angular/common';
import { TranslateService } from 'src/app/components/translate/translate.service';
import dayjs from 'dayjs';

@Component({
  selector: 'app-client-notifications-settings',
  templateUrl: './client-notifications-settings.component.html',
  styleUrls: ['./client-notifications-settings.component.scss']
})
export class ClientNotificationsSettingsComponent implements OnInit {
  public settings?: ClientNotificationsSettings;

  public isLoading: boolean = false;

  private subs: Subscription[] = [];

  hours = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24];
  minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  constructor(
    private location: Location,
    private clientNotificationsService: ClientNotificationsService,
    private translateService: TranslateService
  ) { }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private load() {
    this.subs.push(this.clientNotificationsService.getSettings().subscribe((settings: ClientNotificationsSettings) => {
      if (settings.appointmentConfirmationMessageTemplate == null || settings.appointmentConfirmationMessageTemplate == "") {
        settings.appointmentConfirmationMessageTemplate = this.translateService.translate("pages.client-notifications.defaults.APPOINTMENT_CONFIRMATION");
      }

      if (settings.appointmentReminderMessageTemplate == null || settings.appointmentReminderMessageTemplate == "") {
        settings.appointmentReminderMessageTemplate = this.translateService.translate("pages.client-notifications.defaults.APPOINTMENT_REMINDER");
      }

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

  public formatHourMinute(hourMinute: number): string {
    return hourMinute.toString().padStart(2, "0");
  }

  public setReminderTimeEnabled(value: boolean) {
    if (this.settings == null)
      return;

    if (!value)
      this.settings.appointmentReminderTime = undefined;
    else
      this.settings.appointmentReminderTime = dayjs().hour(10).minute(0).second(0).millisecond(0);
  }

  public setReminderHour(hours: number) {
    if (this.settings == null || this.settings.appointmentReminderTime == null)
      return;

    this.settings.appointmentReminderTime = this.settings.appointmentReminderTime.hour(hours);
  }

  public setReminderMinute(minutes: number) {
    if (this.settings == null || this.settings.appointmentReminderTime == null)
      return;

    this.settings.appointmentReminderTime = this.settings.appointmentReminderTime.minute(minutes);
  }
}
