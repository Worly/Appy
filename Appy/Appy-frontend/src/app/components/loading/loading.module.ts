import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { TranslateModule } from "../translate/translate.module";
import { LoadingComponent } from "./loading.component";

@NgModule({
    declarations: [
        LoadingComponent
    ],
    imports: [
        CommonModule,

        FontAwesomeModule,
        TranslateModule
    ],
    exports: [
        LoadingComponent
    ]
})
export class LoadingModule {

}