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
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { ClientContactDTO, ClientContactType } from "src/app/models/client";
import { IconName } from "@fortawesome/fontawesome-svg-core";
import { parsePhoneNumber } from 'libphonenumber-js';

@NgModule({
    declarations: [
        ClientsComponent,
        ClientEditComponent,
        ClientLookupComponent,
    ],
    imports: [
        ClientsRoutingModule,
        SharedModule,

        FontAwesomeModule,
        ContextMenuModule,
        DurationPickerModule,
        ActionBarModule,
        ActionDropdownModule,
        NotifyDialogModule,
        ToastModule,
        SearchModule
    ],
    exports: [
        ClientLookupComponent,
    ]
})
export class ClientsModule {

}

var contactTypeIconMap: { [type in ClientContactType]: IconName } = {
    "Instagram": "instagram",
    "WhatsApp": "whatsapp"
}

export function getClientContactTypeIcon(type: ClientContactType): IconName {
    return contactTypeIconMap[type];
}

export function openClientContactApp(contact: ClientContactDTO) {
    if (contact.value == null || contact.value == "")
        return

    if (contact.type == "WhatsApp") {
        openWhatsApp(contact.value);
    }

    if (contact.type == "Instagram") {
        openInstagram(contact.value);
    }
}

function openInstagram(contactInfo: string) {
    window.open(`https://ig.me/m/${contactInfo}`)
}

function openWhatsApp(contactInfo: string) {
    let phoneNumber = parsePhoneNumber(contactInfo, "HR")
    if (!phoneNumber.isValid()) {
        console.log("Invalid phone number!");
    }

    // substr removes '+' sign at the begging
    let normalized = phoneNumber.format("E.164").substring(1);
    window.open(`whatsapp://send?phone=${normalized}`)
}