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
import { DateAdapter, MatNativeDateModule, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
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
import { ElementRefDirective } from './directives/element-ref.directive';
import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { DialogComponent } from './components/dialog/dialog.component';
import { FacilityEditComponent } from './pages/facilities/single-facility/facility-edit/facility-edit.component';
import { SelectedFacilityComponent } from './components/selected-facility/selected-facility.component';
import { FacilityInterceptor } from './services/facilities/facility-interceptor.service';
import { TranslatePipe } from './services/translate/translate.pipe';
import { LanguagePickerComponent } from './components/language-picker/language-picker.component';
import { ServicesComponent } from './pages/services/services.component';
import { ServiceEditComponent } from './pages/services/service-edit/service-edit.component';
import { ServiceColorPickerComponent } from './pages/services/service-edit/service-color-picker/service-color-picker.component';
import { OverlayModule } from '@angular/cdk/overlay';
import { DurationPickerComponent } from './components/duration-picker/duration-picker.component';
import { NotifyDialogComponent } from './components/notify-dialog/notify-dialog.component';
import { SingleAppointmentComponent } from './pages/appointments/single-day-appointments/single-appointment/single-appointment.component';
import { AppointmentsComponent } from './pages/appointments/appointments.component';
import { SingleDayAppointmentsComponent } from './pages/appointments/single-day-appointments/single-day-appointments.component';
import { AppointmentEditComponent } from './pages/appointments/appointment-edit/appointment-edit.component';
import { ServiceLookupComponent } from './pages/services/service-lookup/service-lookup.component';
import { AppointmentsScrollerComponent } from './pages/appointments/appointments-scroller/appointments-scroller.component';
import { FilterPipe } from './pipes/filter.pipe';
import { FormatDurationPipe } from './pipes/format-duration.pipe';
import { CalendarTodayHeaderComponent } from './components/calendar-today-header/calendar-today-header.component';
import { DateTimeChooserComponent } from './pages/appointments/appointment-edit/date-time-chooser/date-time-chooser.component';
import { WorkingHoursComponent } from './pages/working-hours/working-hours.component';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons/faAngleLeft";
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons/faAngleRight";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faCaretUp } from "@fortawesome/free-solid-svg-icons/faCaretUp";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
import { faPen } from "@fortawesome/free-solid-svg-icons/faPen";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";

import dayjs from "dayjs";
import "dayjs/locale/hr";
import "dayjs/locale/en-gb";
import updateLocale from "dayjs/plugin/updateLocale";
import localeData from "dayjs/plugin/localeData";
import customParseFormat from "dayjs/plugin/customParseFormat";
import objectSupport from "dayjs/plugin/objectSupport";
import utc from "dayjs/plugin/utc";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import isBetween from "dayjs/plugin/isBetween";
import duration from "dayjs/plugin/duration";
import { DayjsDateAdapter, MAT_DAYJS_DATE_ADAPTER_OPTIONS, MAT_DAYJS_DATE_FORMATS } from './utils/material-dayjs-adapter';
import { ActionBarComponent } from './components/action-bar/action-bar.component';
import { FlexSplitterDirective } from './components/action-bar/directives/flex-splitter.directive';

dayjs.extend(updateLocale);
dayjs.extend(localeData);
dayjs.extend(customParseFormat);
dayjs.extend(objectSupport);
dayjs.extend(utc);
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
dayjs.extend(isBetween);
dayjs.extend(duration);

@NgModule({
  declarations: [
    AppComponent,
    TranslatePipe,
    FilterPipe,
    FormatDurationPipe,
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
    LanguagePickerComponent,
    ServicesComponent,
    ServiceEditComponent,
    ServiceColorPickerComponent,
    DurationPickerComponent,
    NotifyDialogComponent,
    AppointmentsComponent,
    SingleDayAppointmentsComponent,
    AppointmentEditComponent,
    ServiceLookupComponent,
    AppointmentsScrollerComponent,
    CalendarTodayHeaderComponent,
    DateTimeChooserComponent,
    WorkingHoursComponent,
    SingleAppointmentComponent,
    ActionBarComponent,
    FlexSplitterDirective
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule,
    OverlayModule,
    OrderModule,
    NoopAnimationsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FontAwesomeModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    })
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
    { provide: APP_INITIALIZER, useFactory: appInitializerFactory, deps: [AppInitializerService], multi: true },
    { provide: MAT_DAYJS_DATE_ADAPTER_OPTIONS, useValue: { useUtc: true } },
    { provide: DateAdapter, useClass: DayjsDateAdapter, deps: [MAT_DATE_LOCALE, MAT_DAYJS_DATE_ADAPTER_OPTIONS], },
    { provide: MAT_DATE_FORMATS, useValue: MAT_DAYJS_DATE_FORMATS },
    { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: FacilityInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorTranslateInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(library: FaIconLibrary) {
    library.addIcons(
      faBars,
      faSpinner,
      faAngleLeft, faAngleRight,
      faTimes, faPlus,
      faCaretDown, faCaretUp,
      faTrash, faPen,
      faEllipsisV,
    );
  }

}

export function appInitializerFactory(appInitializerService: AppInitializerService) {
  return () => appInitializerService.initialize();
}

