import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { ActionBarModule } from "src/app/components/action-bar/action-bar.module";
import { DropdownModule } from "src/app/components/dropdown/dropdown.module";
import { DateSelectorModule } from "src/app/components/date-selector/date-selector.module";
import { TimeOffRoutingModule } from "./time-off-routing.module";
import { TimeOffComponent } from "./components/time-off/time-off.component";
import { TimeOffEditComponent } from "./components/time-off-edit/time-off-edit.component";

@NgModule({
  declarations: [
    TimeOffComponent,
    TimeOffEditComponent,
  ],
  imports: [
    TimeOffRoutingModule,
    SharedModule,
    ActionBarModule,
    DropdownModule,
    DateSelectorModule,
  ],
})
export class TimeOffModule { }
