import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ButtonModule } from "../button/button.module";
import { ContextMenuModule } from "../context-menu/context-menu.module";
import { TranslateModule } from "../translate/translate.module";
import { DropdownComponent } from "./dropdown.component";

@NgModule({
    declarations: [
        DropdownComponent
    ],
    imports: [
        CommonModule,
        ButtonModule,
        ContextMenuModule,
        TranslateModule
    ],
    exports: [
        DropdownComponent
    ]
})
export class DropdownModule {

}