import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { ActionBarModule } from "src/app/components/action-bar/action-bar.module";
import { DropdownModule } from "src/app/components/dropdown/dropdown.module";
import { DateSelectorModule } from "src/app/components/date-selector/date-selector.module";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { TimeOffRoutingModule } from "./time-off-routing.module";
import { TimeOffComponent } from "./components/time-off/time-off.component";
import { TimeOffEditComponent } from "./components/time-off-edit/time-off-edit.component";
import { SingleTimeOffListItemComponent } from "./components/single-time-off-list-item/single-time-off-list-item.component";
import { TimeOffListComponent } from "./components/time-off-list/time-off-list.component";
import { SingleTimeOffComponent } from "./components/single-time-off/single-time-off.component";

@NgModule({
  declarations: [
    TimeOffComponent,
    TimeOffEditComponent,
    SingleTimeOffListItemComponent,
    TimeOffListComponent,
    SingleTimeOffComponent,
  ],
  imports: [
    TimeOffRoutingModule,
    SharedModule,
    ActionBarModule,
    DropdownModule,
    DateSelectorModule,
    FontAwesomeModule,
  ],
})
export class TimeOffModule { }
