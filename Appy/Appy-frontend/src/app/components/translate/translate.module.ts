import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { TranslatePipe } from "./translate.pipe";
import { TranslateService } from "./translate.service";

@NgModule({
    declarations: [
        TranslatePipe
    ],
    imports: [
        CommonModule
    ],
    exports: [
        TranslatePipe
    ]
})
export class TranslateModule {

}