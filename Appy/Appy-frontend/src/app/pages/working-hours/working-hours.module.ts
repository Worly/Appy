import { NgModule } from "@angular/core";
import { ActionBarModule } from "src/app/components/action-bar/action-bar.module";
import { DropdownModule } from "src/app/components/dropdown/dropdown.module";
import { SharedModule } from "src/app/shared/shared.module";
import { WorkingHoursComponent } from "./components/working-hours.component";
import { WorkingHoursService } from "./services/working-hours.service";

@NgModule({
    declarations: [
        WorkingHoursComponent
    ],
    imports: [
        SharedModule,

        ActionBarModule,
        DropdownModule
    ],
    providers: [
        WorkingHoursService
    ],
    exports: [
        
    ]
})
export class WorkingHoursModule {

}