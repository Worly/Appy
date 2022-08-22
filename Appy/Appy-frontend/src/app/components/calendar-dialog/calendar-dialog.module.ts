import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { MatDatepickerModule } from "@angular/material/datepicker";
import { ButtonModule } from "../button/button.module";
import { DialogModule } from "../dialog/dialog.module";
import { TranslateModule } from "../translate/translate.module";
import { CalendarDialogComponent } from "./calendar-dialog.component";
import { CalendarTodayHeaderComponent } from "./calendar-today-header/calendar-today-header.component";

@NgModule({
    declarations: [
        CalendarDialogComponent,
        CalendarTodayHeaderComponent
    ],
    imports: [
        CommonModule,
        DialogModule,
        MatDatepickerModule,
        ButtonModule,
        TranslateModule
    ],
    exports: [
        CalendarDialogComponent
    ]
})
export class CalendarDialogModule {

}