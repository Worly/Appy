import { OverlayModule } from "@angular/cdk/overlay";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { ButtonModule } from "../button/button.module";
import { ToastComponent } from "./toast.component";

@NgModule({
    declarations: [
        ToastComponent
    ],
    imports: [
        CommonModule,
        FontAwesomeModule,
        ButtonModule,
        OverlayModule
    ],
    exports: [
        ToastComponent
    ]
})
export class ToastModule {

}