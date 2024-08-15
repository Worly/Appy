import { Component } from '@angular/core';
import { Subscription } from 'rxjs';
import { DashboardService } from '../services/dashboard.service';
import { Appointment } from 'src/app/models/appointment';
import { TranslateService } from 'src/app/components/translate/translate.service';
import { Router } from '@angular/router';
import { EntityChangeNotifyService } from 'src/app/shared/services/entity-change-notify.service';

@Component({
  selector: 'app-upcoming-unconfirmed',
  templateUrl: './upcoming-unconfirmed.component.html',
  styleUrls: ['./upcoming-unconfirmed.component.scss']
})
export class UpcomingUnconfirmedComponent {
  numberOfAppointmentsToShow = 3;

  appointments?: Appointment[];
  viewMoreText?: string;

  private subs: Subscription[] = [];

  constructor(
    private router: Router,
    private dashboardService: DashboardService,
    private translateService: TranslateService,
    private entityChangeNotifyService: EntityChangeNotifyService
  ) {
    this.subs.push(
      ...this.entityChangeNotifyService.for<Appointment>(Appointment.ENTITY_TYPE).subscribeAll({
        onAdded: () => this.load(),
        onDeleted: () => this.load(),
        onUpdated: () => this.load()
      })
    );
  }

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  load(): void {
    this.subs.push(this.dashboardService.getUpcomingUnconfirmed().subscribe(a => {
      this.appointments = a;

      this.viewMoreText = "";

      if (this.appointments.length > this.numberOfAppointmentsToShow)
        this.viewMoreText = "+ " + (this.appointments.length - this.numberOfAppointmentsToShow)
          + " " + this.translateService.translate("pages.dashboard.MORE").toLowerCase() + "...";
      else
        this.viewMoreText = this.translateService.translate("VIEW_ALL");
    }));
  }

  openAppointments() {
    if (this.appointments == null || this.appointments.length == 0)
      return;

    this.router.navigate(["appointments"], {
      queryParams: {
        date: this.appointments[0].date?.format("YYYY-MM-DD"),
        filter: JSON.stringify({
          status: "Unconfirmed"
        })
      }
    });
  }
}
