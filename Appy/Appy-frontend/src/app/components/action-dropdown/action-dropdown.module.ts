import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ButtonModule } from "../button/button.module";
import { ContextMenuModule } from "../context-menu/context-menu.module";
import { ActionDropdownComponent } from "./action-dropdown.component";

@NgModule({
    declarations: [
        ActionDropdownComponent
    ],
    imports: [
        CommonModule,

        ButtonModule,
        ContextMenuModule
    ],
    exports: [
        ActionDropdownComponent
    ]
})
export class ActionDropdownModule {

}