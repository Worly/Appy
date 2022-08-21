import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ButtonModule } from "../button/button.module";
import { ContextMenuModule } from "../context-menu/context-menu.module";
import { LanguagePickerComponent } from "./language-picker.component";

@NgModule({
    declarations: [
        LanguagePickerComponent
    ],
    imports: [
        CommonModule,
        ButtonModule,
        ContextMenuModule
    ],
    exports: [
        LanguagePickerComponent
    ]
})
export class LanguagePickerModule {

}