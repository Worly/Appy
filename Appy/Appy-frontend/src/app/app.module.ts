import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { Router, RouteReuseStrategy } from '@angular/router';
import { CustomReuseStrategy } from './services/route-reuse-strategy';
import { AttachDetachHooksService } from './services/attach-detach-hooks.service';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { AppInitializerService } from './services/app-initializer.service';
import { DayjsDateAdapter, MAT_DAYJS_DATE_ADAPTER_OPTIONS, MAT_DAYJS_DATE_FORMATS } from './utils/material-dayjs-adapter';
import { faBusinessTime } from '@fortawesome/free-solid-svg-icons';
import { ButtonModule } from './components/button/button.module';
import { AppointmentsModule } from './pages/appointments/appointments.module';
import { ServicesModule } from './pages/services/services.module';
import { WorkingHoursModule } from './pages/working-hours/working-hours.module';
import { FacilitiesModule } from './pages/facilities/facilities.module';
import { TranslateModule } from './components/translate/translate.module';
import { LanguagePickerModule } from './components/language-picker/language-picker.module';
import { LoginModule } from './pages/login/login.module';
import { RegisterModule } from './pages/register/register.module';
import { HomeModule } from './pages/home/home.module';
import { ErrorModule } from './pages/error/error.module';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
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
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,

    ButtonModule,
    TranslateModule,
    LanguagePickerModule,

    ErrorModule,
    LoginModule,
    RegisterModule,
    FacilitiesModule,
    HomeModule,
    AppointmentsModule,
    ServicesModule,
    WorkingHoursModule,

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
    { provide: MAT_DATE_FORMATS, useValue: MAT_DAYJS_DATE_FORMATS }
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
      faBusinessTime
    );
  }

}

export function appInitializerFactory(appInitializerService: AppInitializerService) {
  return () => appInitializerService.initialize();
}

