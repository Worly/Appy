import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { DashboardComponent } from "./dashboard.component";
import { BookedTodayComponent } from './booked-today/booked-today.component';
import { UpcomingUnconfirmedComponent } from './upcoming-unconfirmed/upcoming-unconfirmed.component';
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { AppointmentsModule } from "../appointments/appointments.module";
import { DialogModule } from "src/app/components/dialog/dialog.module";
import { DropdownModule } from "../../components/dropdown/dropdown.module";

@NgModule({
    declarations: [
        DashboardComponent,
        BookedTodayComponent,
        UpcomingUnconfirmedComponent
    ],
    imports: [
        SharedModule,
        FontAwesomeModule,
        DialogModule,
        AppointmentsModule,
        DropdownModule
    ],
    exports: [
        DashboardComponent
    ]
})
export class DashboardModule {

}