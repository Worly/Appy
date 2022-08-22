import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ButtonModule } from "../button/button.module";
import { CalendarDialogModule } from "../calendar-dialog/calendar-dialog.module";
import { DialogModule } from "../dialog/dialog.module";
import { DateSelectorComponent } from "./date-selector.component";

@NgModule({
    declarations: [
        DateSelectorComponent
    ],
    imports: [
        CommonModule,
        DialogModule,
        ButtonModule,
        CalendarDialogModule
    ],
    exports: [
        DateSelectorComponent
    ]
})
export class DateSelectorModule {

}