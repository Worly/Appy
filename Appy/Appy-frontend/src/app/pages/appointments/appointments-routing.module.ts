import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { AppointmentEditComponent } from "./components/appointment-edit/appointment-edit.component";
import { AppointmentsComponent } from "./components/appointments/appointments.component";

const routes: Routes = [
    {
        path: "",
        component: AppointmentsComponent
      },
      {
        path: "edit/:id",
        component: AppointmentEditComponent
      },
      {
        path: "new",
        component: AppointmentEditComponent,
        data: { isNew: true }
      },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AppointmentsRoutingModule { }