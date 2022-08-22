import { OverlayModule } from "@angular/cdk/overlay";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ButtonModule } from "../button/button.module";
import { DialogComponent } from "./dialog.component";

@NgModule({
    declarations: [
        DialogComponent
    ],
    imports: [
        CommonModule,
        ButtonModule,
        OverlayModule
    ],
    exports: [
        DialogComponent
    ]
})
export class DialogModule {

}