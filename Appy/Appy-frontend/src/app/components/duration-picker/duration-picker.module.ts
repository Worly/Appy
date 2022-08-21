import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ButtonModule } from "../button/button.module";
import { ContextMenuModule } from "../context-menu/context-menu.module";
import { TranslateModule } from "../translate/translate.module";
import { DurationPickerComponent } from "./duration-picker.component";

@NgModule({
    declarations: [
        DurationPickerComponent
    ],
    imports: [
        CommonModule,
        ButtonModule,
        ContextMenuModule,
        TranslateModule
    ],
    exports: [
        DurationPickerComponent
    ]
})
export class DurationPickerModule {

}