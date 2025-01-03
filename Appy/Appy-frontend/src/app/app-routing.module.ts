import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { ErrorComponent } from './pages/error/error.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { SelectedFacilityGuard } from './pages/facilities/services/facility.guard';
import { FacilitiesComponent } from './pages/facilities/components/facilities/facilities.component';
import { LoggedInGuard, NotLoggedInGuard } from './shared/services/auth/auth.guard';
import { appConfig } from './app.config';

const routes: Routes = [
  { path: "login", component: LoginComponent, canActivate: [NotLoggedInGuard] },
  { path: "register", component: RegisterComponent, canActivate: [NotLoggedInGuard] },

  {
    path: "error",
    component: ErrorComponent,
  },
  {
    path: "dashboard",
    component: DashboardComponent,
    canActivate: [LoggedInGuard, SelectedFacilityGuard]
  },
  {
    path: "facilities",
    component: FacilitiesComponent,
    canActivate: [LoggedInGuard]
  },

  {
    path: "services",
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
    loadChildren: () => import('./pages/services/services.module').then(m => m.ServicesModule)
  },
  {
    path: "clients",
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
    loadChildren: () => import('./pages/clients/clients.module').then(m => m.ClientsModule)
  },
  {
    path: "appointments",
    loadChildren: () => import("./pages/appointments/appointments.module").then(m => m.AppointmentsModule),
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
  },
  {
    path: "working-hours",
    loadChildren: () => import("./pages/working-hours/working-hours.module").then(m => m.WorkingHoursModule),
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
  },
  {
    path: "client-notifications",
    loadChildren: () => import("./pages/client-notifications/client-notifications.module").then(m => m.ClientNotificationsModule),
    canActivate: [LoggedInGuard, SelectedFacilityGuard],
  },

  { path: "**", redirectTo: appConfig.homePage }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'enabled',
    preloadingStrategy: PreloadAllModules
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
