import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ErrorComponent } from './pages/error/error.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { FacilitiesComponent } from './pages/facilities/facilities.component';
import { LoggedInGuard, NotLoggedInGuard } from './services/auth/auth.guard';
import { SelectedFacilityGuard } from './services/facilities/facility.guard';
import { ServicesComponent } from './pages/services/services.component';
import { ServiceEditComponent } from './pages/services/service-edit/service-edit.component';
import { AppointmentsComponent } from './pages/appointments/appointments.component';

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
    canActivate: [LoggedInGuard],
    data: { shouldDetach: true, detachGroup: "services" }
  },
  {
    path: "services/edit/:id",
    component: ServiceEditComponent,
    canActivate: [LoggedInGuard],
    data: { detachGroup: "services" }
  },
  {
    path: "services/new",
    component: ServiceEditComponent,
    canActivate: [LoggedInGuard],
    data: { isNew: true, detachGroup: "services" }
  },
  // #endregion

  // #region APPOINTMENTS
  {
    path: "appointments",
    component: AppointmentsComponent,
    canActivate: [LoggedInGuard],
    data: { shouldDetach: true, detachGroup: "appointments" }
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
