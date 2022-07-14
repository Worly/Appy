import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { LoadingComponent } from './components/loading/loading.component';
import { Router, RouteReuseStrategy } from '@angular/router';
import { CustomReuseStrategy } from './services/route-reuse-strategy';
import { ToastComponent } from './components/toast/toast.component';
import { OrderModule } from 'ngx-order-pipe';
import { FormsModule } from '@angular/forms';
import { DropdownComponent } from './components/dropdown/dropdown.component';
import { AttachDetachHooksService } from './services/attach-detach-hooks.service';
import { InvokeDirective } from './directives/invoke-directive/invoke.directive';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MatNativeDateModule } from '@angular/material/core';
import { CustomDateAdapter } from './services/custom-date-adapter';
import { AuthHttpInterceptor } from './services/auth/auth-http-interceptor.service';
import { LoginComponent } from './pages/login/login.component';
import { ErrorTranslateInterceptor } from './services/errors/error-translate.service';
import { RegisterComponent } from './pages/register/register.component';
import { ErrorComponent } from './pages/error/error.component';
import { ErrorInterceptor } from './services/errors/error-interceptor.service';
import { FacilitiesComponent } from './pages/facilities/facilities.component';
import { SingleFacilityComponent } from './pages/facilities/single-facility/single-facility.component';
import { AppInitializerService } from './services/app-initializer.service';
import { ContextMenuComponent } from './components/context-menu/context-menu.component';
import { ButtonComponent } from './components/button/button.component';
import { ToppyModule } from 'toppy';
import { ElementRefDirective } from './directives/element-ref.directive';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { DialogComponent } from './components/dialog/dialog.component';
import { FacilityEditComponent } from './pages/facilities/single-facility/facility-edit/facility-edit.component';
import { SelectedFacilityComponent } from './components/selected-facility/selected-facility.component';
import { FacilityInterceptor } from './services/facilities/facility-interceptor.service';
import { TranslatePipe } from './services/translate/translate.pipe';
import { LanguagePickerComponent } from './components/language-picker/language-picker.component';



@NgModule({
  declarations: [
    AppComponent,
    TranslatePipe,
    LoginComponent,
    RegisterComponent,
    FacilitiesComponent,
    ErrorComponent,
    InvokeDirective,
    HomeComponent,
    LoadingComponent,
    ToastComponent,
    DropdownComponent,
    SingleFacilityComponent,
    ContextMenuComponent,
    ButtonComponent,
    ElementRefDirective,
    DialogComponent,
    FacilityEditComponent,
    SelectedFacilityComponent,
    LanguagePickerComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    OrderModule,
    NoopAnimationsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    ToppyModule,
    FontAwesomeModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: CustomReuseStrategy },
    {
      provide: APP_INITIALIZER, useFactory:
        function initAttachDetachHooks(router: Router, reuseStrategy: RouteReuseStrategy) {
          return () => new AttachDetachHooksService(router, reuseStrategy);
        },
      deps: [Router, RouteReuseStrategy], multi: true
    },
    { provide: DateAdapter, useClass: CustomDateAdapter },
    { provide: APP_INITIALIZER, useFactory: appInitializerFactory, deps: [AppInitializerService], multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: FacilityInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorTranslateInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { 
  constructor(library: FaIconLibrary) {
    library.addIconPacks(fas);
  }

}

export function appInitializerFactory(appInitializerService: AppInitializerService) {
  return () => appInitializerService.initialize();
}

