import { NgModule } from "@angular/core";
import { ActionBarModule } from "src/app/components/action-bar/action-bar.module";
import { ContextMenuModule } from "src/app/components/context-menu/context-menu.module";
import { DurationPickerModule } from "src/app/components/duration-picker/duration-picker.module";
import { NotifyDialogModule } from "src/app/components/notify-dialog/notify-dialog.module";
import { SharedModule } from "src/app/shared/shared.module";
import { ServiceColorPickerComponent } from "./components/service-edit/service-color-picker/service-color-picker.component";
import { ServiceEditComponent } from "./components/service-edit/service-edit.component";
import { ServiceLookupComponent } from "./components/service-lookup/service-lookup.component";
import { ServicesComponent } from "./components/services/services.component";
import { ServiceColorsService } from "./services/service-colors.service";
import { ServiceService } from "./services/service.service";

@NgModule({
    declarations: [
        ServicesComponent,
        ServiceEditComponent,
        ServiceColorPickerComponent,
        ServiceLookupComponent
    ],
    imports: [
        SharedModule,
        
        ContextMenuModule,
        DurationPickerModule,
        ActionBarModule,
        NotifyDialogModule
    ],
    providers: [
        ServiceService,
        ServiceColorsService
    ],
    exports: [
        ServiceLookupComponent
    ]
})
export class ServicesModule {

}