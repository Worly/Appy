import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ErrorComponent } from './pages/error/error.component';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { CompaniesComponent } from './pages/companies/companies.component';
import { LoggedInGuard, NotLoggedInGuard } from './services/auth/auth.guard';
import { SelectedCompanyGuard } from './services/companies/company.guard';

const routes: Routes = [
  { path: "login", component: LoginComponent, canActivate: [NotLoggedInGuard] },
  { path: "register", component: RegisterComponent, canActivate: [NotLoggedInGuard] },

  {
    path: "companies",
    component: CompaniesComponent,
    canActivate: [LoggedInGuard]
  },
  {
    path: "home",
    component: HomeComponent,
    canActivate: [LoggedInGuard, SelectedCompanyGuard]
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
