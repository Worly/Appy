import { CommonModule } from "@angular/common";
import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "../components/button/button.module";
import { LoadingModule } from "../components/loading/loading.module";
import { TranslateModule } from "../components/translate/translate.module";
import { InvokeDirective } from "./directives/invoke-directive/invoke.directive";
import { StuckAttrDirective } from "./directives/stuck-attr-directive/stuck-attr.directive";
import { FilterPipe } from "./pipes/filter.pipe";
import { FormatDurationPipe } from "./pipes/format-duration.pipe";
import { AuthHttpInterceptor } from "./services/auth/auth-http-interceptor.service";
import { ErrorInterceptor } from "./services/errors/error-interceptor.service";
import { ErrorTranslateInterceptor } from "./services/errors/error-translate.service";

@NgModule({
    declarations: [
        FilterPipe,
        FormatDurationPipe,
        InvokeDirective,
        StuckAttrDirective
    ],
    imports: [

    ],
    exports: [
        CommonModule,
        FormsModule,

        TranslateModule,
        ButtonModule,
        LoadingModule,

        FilterPipe,
        FormatDurationPipe,
        InvokeDirective,
        StuckAttrDirective
    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: AuthHttpInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorTranslateInterceptor, multi: true },
        { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true }
    ]
})
export class SharedModule {

}