import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AppointmentEditComponent } from "./components/appointment-edit/appointment-edit.component";
import { AppointmentsComponent } from "./components/appointments/appointments.component";

const routes: Routes = [
    {
        path: "",
        component: AppointmentsComponent,
        data: { shouldDetach: true, detachGroup: "appointments" }
      },
      {
        path: "edit/:id",
        component: AppointmentEditComponent,
        data: { detachGroup: "appointments" }
      },
      {
        path: "new",
        component: AppointmentEditComponent,
        data: { isNew: true, detachGroup: "appointments" }
      },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AppointmentsRoutingModule { }