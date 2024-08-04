import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { DashboardComponent } from "./dashboard.component";
import { BookedTodayComponent } from './booked-today/booked-today.component';

@NgModule({
    declarations: [
        DashboardComponent,
        BookedTodayComponent
    ],
    imports: [
        SharedModule
    ],
    exports: [
        DashboardComponent
    ]
})
export class DashboardModule {

}