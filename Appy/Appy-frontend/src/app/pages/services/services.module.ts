import { NgModule } from "@angular/core";
import { ActionBarModule } from "src/app/components/action-bar/action-bar.module";
import { ActionDropdownModule } from "src/app/components/action-dropdown/action-dropdown.module";
import { ContextMenuModule } from "src/app/components/context-menu/context-menu.module";
import { DurationPickerModule } from "src/app/components/duration-picker/duration-picker.module";
import { NotifyDialogModule } from "src/app/components/notify-dialog/notify-dialog.module";
import { SharedModule } from "src/app/shared/shared.module";
import { ServiceColorPickerComponent } from "./components/service-edit/service-color-picker/service-color-picker.component";
import { ServiceEditComponent } from "./components/service-edit/service-edit.component";
import { ServiceLookupComponent } from "./components/service-lookup/service-lookup.component";
import { ServicesComponent } from "./components/services/services.component";
import { ServicesRoutingModule } from "./services-routing.module";

@NgModule({
    declarations: [
        ServicesComponent,
        ServiceEditComponent,
        ServiceColorPickerComponent,
        ServiceLookupComponent
    ],
    imports: [
        ServicesRoutingModule,
        SharedModule,
        
        ContextMenuModule,
        DurationPickerModule,
        ActionBarModule,
        ActionDropdownModule,
        NotifyDialogModule
    ],
    exports: [
        ServiceLookupComponent
    ]
})
export class ServicesModule {

}