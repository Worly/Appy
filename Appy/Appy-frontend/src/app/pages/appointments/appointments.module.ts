import { NgModule } from "@angular/core";
import { ActionBarModule } from "src/app/components/action-bar/action-bar.module";
import { CalendarDialogModule } from "src/app/components/calendar-dialog/calendar-dialog.module";
import { ContextMenuModule } from "src/app/components/context-menu/context-menu.module";
import { DateSelectorModule } from "src/app/components/date-selector/date-selector.module";
import { DialogModule } from "src/app/components/dialog/dialog.module";
import { DurationPickerModule } from "src/app/components/duration-picker/duration-picker.module";
import { SharedModule } from "src/app/shared/shared.module";
import { ClientsModule } from "../clients/clients.module";
import { ServicesModule } from "../services/services.module";
import { AppointmentsRoutingModule } from "./appointments-routing.module";
import { AppointmentEditComponent } from "./components/appointment-edit/appointment-edit.component";
import { DateTimeChooserComponent } from "./components/appointment-edit/date-time-chooser/date-time-chooser.component";
import { TimeButtonComponent } from "./components/appointment-edit/date-time-chooser/time-button/time-button.component";
import { AppointmentsListComponent } from "./components/appointments-list/appointments-list.component";
import { AppointmentsScrollerComponent } from "./components/appointments-scroller/appointments-scroller.component";
import { AppointmentsComponent } from "./components/appointments/appointments.component";
import { SingleAppointmentComponent } from "./components/single-appointment/single-appointment.component";
import { SingleDayAppointmentsComponent } from "./components/appointments-scroller/single-day-appointments/single-day-appointments.component";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { AppointmentStatusLookupComponent } from './components/appointment-status-lookup/appointment-status-lookup.component';
import { AppointmentStatusInfoPipe } from "./services/appointment-status-info.pipe";
import { SingleAppointmentListItemComponent } from "./components/appointments-list/single-appointment-list-item/single-appointment-list-item.component";

@NgModule({
    declarations: [
        AppointmentsComponent,
        AppointmentEditComponent,
        DateTimeChooserComponent,
        TimeButtonComponent,
        AppointmentsScrollerComponent,
        SingleDayAppointmentsComponent,
        SingleAppointmentComponent,
        AppointmentsListComponent,
        AppointmentStatusLookupComponent,
        AppointmentStatusInfoPipe,
        SingleAppointmentListItemComponent
    ],
    imports: [
        AppointmentsRoutingModule,
        SharedModule,
        
        FontAwesomeModule,
        
        ClientsModule,
        ServicesModule,
        
        DialogModule,
        CalendarDialogModule,
        DateSelectorModule,
        DurationPickerModule,
        ActionBarModule,
        ContextMenuModule
    ],
    exports: [
        SingleAppointmentComponent,
        SingleAppointmentListItemComponent
    ]
})
export class AppointmentsModule {

}