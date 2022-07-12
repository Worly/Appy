import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ErrorComponent } from './pages/error/error.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { FacilitiesComponent } from './pages/facilities/facilities.component';
import { LoggedInGuard, NotLoggedInGuard } from './services/auth/auth.guard';
import { SelectedFacilityGuard } from './services/facilities/facility.guard';

const routes: Routes = [
  { path: "login", component: LoginComponent, canActivate: [NotLoggedInGuard] },
  { path: "register", component: RegisterComponent, canActivate: [NotLoggedInGuard] },

  {
    path: "facilities",
    component: FacilitiesComponent,
    canActivate: [LoggedInGuard]
  },
  {
    path: "home",
    component: HomeComponent,
    canActivate: [LoggedInGuard, SelectedFacilityGuard]
  },
  {
    path: "error",
    component: ErrorComponent,
  },
  { path: "**", redirectTo: "/home" }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {
    scrollPositionRestoration: 'enabled'
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { }
