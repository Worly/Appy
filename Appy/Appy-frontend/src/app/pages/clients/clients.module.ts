import { NgModule } from "@angular/core";
import { ActionBarModule } from "src/app/components/action-bar/action-bar.module";
import { ActionDropdownModule } from "src/app/components/action-dropdown/action-dropdown.module";
import { ContextMenuModule } from "src/app/components/context-menu/context-menu.module";
import { DurationPickerModule } from "src/app/components/duration-picker/duration-picker.module";
import { NotifyDialogModule } from "src/app/components/notify-dialog/notify-dialog.module";
import { SearchModule } from "src/app/components/search/search.module";
import { ToastModule } from "src/app/components/toast/toast.module";
import { SharedModule } from "src/app/shared/shared.module";
import { ClientsRoutingModule } from "./clients-routing.module";
import { ClientEditComponent } from "./components/client-edit/client-edit.component";
import { ClientLookupComponent } from "./components/client-lookup/client-lookup.component";
import { ClientsComponent } from "./components/clients/clients.component";

@NgModule({
    declarations: [
        ClientsComponent,
        ClientEditComponent,
        ClientLookupComponent
    ],
    imports: [
        ClientsRoutingModule,
        SharedModule,
        
        ContextMenuModule,
        DurationPickerModule,
        ActionBarModule,
        ActionDropdownModule,
        NotifyDialogModule,
        ToastModule,
        SearchModule
    ],
    exports: [
        ClientLookupComponent
    ]
})
export class ClientsModule {

}