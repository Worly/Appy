import { OverlayModule } from "@angular/cdk/overlay";
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ButtonModule } from "../button/button.module";
import { NotifyDialogComponent } from "./notify-dialog.component";
import { NotifyDialogService } from "./notify-dialog.service";

@NgModule({
    declarations: [
        NotifyDialogComponent
    ],
    imports: [
        CommonModule,
        ButtonModule,
        OverlayModule
    ],
    exports: [
        NotifyDialogComponent
    ],
    providers: [
        NotifyDialogService
    ]
})
export class NotifyDialogModule {

}