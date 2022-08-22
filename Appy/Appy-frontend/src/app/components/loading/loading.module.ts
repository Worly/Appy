import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { TranslateModule } from "../translate/translate.module";
import { LoadingComponent } from "./loading.component";

@NgModule({
    declarations: [
        LoadingComponent
    ],
    imports: [
        FontAwesomeModule,
        TranslateModule
    ],
    exports: [
        LoadingComponent
    ]
})
export class LoadingModule {

}