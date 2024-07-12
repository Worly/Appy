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
import { ButtonModule } from './components/button/button.module';
import { FacilitiesModule } from './pages/facilities/facilities.module';
import { TranslateModule } from './components/translate/translate.module';
import { LanguagePickerModule } from './components/language-picker/language-picker.module';
import { LoginModule } from './pages/login/login.module';
import { RegisterModule } from './pages/register/register.module';
import { HomeModule } from './pages/home/home.module';
import { ErrorModule } from './pages/error/error.module';
import { ServiceWorkerModule } from '@angular/service-worker';
import { environment } from '../environments/environment';
import { ContextMenuModule } from './components/context-menu/context-menu.module';
import { SharedModule } from './shared/shared.module';

import { FaIconLibrary, FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars";
import { faCaretDown } from "@fortawesome/free-solid-svg-icons/faCaretDown";
import { faCaretUp } from "@fortawesome/free-solid-svg-icons/faCaretUp";
import { faAngleUp } from "@fortawesome/free-solid-svg-icons/faAngleUp";
import { faAngleDown } from "@fortawesome/free-solid-svg-icons/faAngleDown";
import { faAngleLeft } from "@fortawesome/free-solid-svg-icons/faAngleLeft";
import { faAngleRight } from "@fortawesome/free-solid-svg-icons/faAngleRight";
import { faEllipsisV } from "@fortawesome/free-solid-svg-icons/faEllipsisV";
import { faPen } from "@fortawesome/free-solid-svg-icons/faPen";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { faBusinessTime } from '@fortawesome/free-solid-svg-icons/faBusinessTime';
import { faBoxArchive } from '@fortawesome/free-solid-svg-icons/faBoxArchive';
import { faCircleCheck } from '@fortawesome/free-solid-svg-icons/faCircleCheck';
import { faCircleCheck as farCircleCheck } from '@fortawesome/free-regular-svg-icons/faCircleCheck'
import { faHouse } from '@fortawesome/free-solid-svg-icons/faHouse';
import { faHandHoldingHeart } from '@fortawesome/free-solid-svg-icons/faHandHoldingHeart';
import { faUsers } from "@fortawesome/free-solid-svg-icons/faUsers";
import { faCalendarWeek } from '@fortawesome/free-solid-svg-icons/faCalendarWeek';
import { faRightFromBracket } from '@fortawesome/free-solid-svg-icons/faRightFromBracket';
import { faCalendarDays } from "@fortawesome/free-regular-svg-icons/faCalendarDays";
import { faTableList } from "@fortawesome/free-solid-svg-icons/faTableList";
import { faFilter } from "@fortawesome/free-solid-svg-icons/faFilter";
import { faFileLines } from "@fortawesome/free-regular-svg-icons/faFileLines";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons/faWhatsapp"
import { faQuestion } from "@fortawesome/free-solid-svg-icons/faQuestion";
import { faCheck } from "@fortawesome/free-solid-svg-icons/faCheck";

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
    FontAwesomeModule,

    SharedModule,
    ButtonModule,
    TranslateModule,
    LanguagePickerModule,
    ContextMenuModule,

    ErrorModule,
    LoginModule,
    RegisterModule,
    FacilitiesModule,
    HomeModule,

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
    { provide: MAT_DAYJS_DATE_ADAPTER_OPTIONS, useValue: { useUtc: false } },
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
      faAngleUp, faAngleDown, faAngleLeft, faAngleRight,
      faTimes, faPlus,
      faCaretDown, faCaretUp,
      faTrash, faPen,
      faEllipsisV,
      faBusinessTime,
      faBoxArchive,
      faCircleCheck, farCircleCheck, faQuestion, faCheck,
      faHouse, faHandHoldingHeart, faUsers, faCalendarWeek, faRightFromBracket,
      faCalendarDays, faTableList, faFilter, faFileLines,
      faWhatsapp
    );
  }

}

export function appInitializerFactory(appInitializerService: AppInitializerService) {
  return () => appInitializerService.initialize();
}

