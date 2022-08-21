import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ErrorComponent } from './pages/error/error.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { SelectedFacilityGuard } from './pages/facilities/services/facility.guard';
import { FacilitiesComponent } from './pages/facilities/components/facilities/facilities.component';
import { AppointmentsComponent } from './pages/appointments/components/appointments/appointments.component';
import { AppointmentEditComponent } from './pages/appointments/components/appointment-edit/appointment-edit.component';
import { ServicesComponent } from './pages/services/components/services/services.component';
import { ServiceEditComponent } from './pages/services/components/service-edit/service-edit.component';
import { WorkingHoursComponent } from './pages/working-hours/components/working-hours.component';
import { LoggedInGuard, NotLoggedInGuard } from './shared/services/auth/auth.guard';

const routes: Routes = [
  { path: "login", component: LoginComponent, canActivate: [NotLoggedInGuard] },
  { path: "register", component: RegisterComponent, canActivate: [NotLoggedInGuard] },

  {
    path: "error",
    component: ErrorComponent,
  },
  {
    path: "home",
    component: HomeComponent,
    canActivate: [LoggedInGuard, SelectedFacilityGuard]
  },
  {
    path: "facilities",
    component: FacilitiesComponent,
    canActivate: [LoggedInGuard]
  },

  // #region SERVICES
  {
    path: "services",
    component: ServicesComponent,
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
    data: { shouldDetach: true, detachGroup: "services" }
  },
  {
    path: "services/edit/:id",
    component: ServiceEditComponent,
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
    data: { detachGroup: "services" }
  },
  {
    path: "services/new",
    component: ServiceEditComponent,
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
    data: { isNew: true, detachGroup: "services" }
  },
  // #endregion

  // #region APPOINTMENTS
  {
    path: "appointments",
    component: AppointmentsComponent,
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
    data: { shouldDetach: true, detachGroup: "appointments" }
  },
  {
    path: "appointments/edit/:id",
    component: AppointmentEditComponent,
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
    data: { detachGroup: "appointments" }
  },
  {
    path: "appointments/new",
    component: AppointmentEditComponent,
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
    data: { isNew: true, detachGroup: "appointments" }
  },
  // #endregion

  // #region WORKING-HOURS
  {
    path: "working-hours",
    component: WorkingHoursComponent,
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
  },
  // #endregion

  { path: "**", redirectTo: "/home" }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
