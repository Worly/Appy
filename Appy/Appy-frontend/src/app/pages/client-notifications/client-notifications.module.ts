import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { ClientNotificationsSettingsComponent } from "./components/client-notifications-settings/client-notifications-settings.component";
import { ClientNotificationsRoutingModule } from "./client-notifications-routing.module";
import { ActionBarModule } from "src/app/components/action-bar/action-bar.module";

@NgModule({
    declarations: [
        ClientNotificationsSettingsComponent,
    ],
    imports: [
        ClientNotificationsRoutingModule,
        SharedModule,

        ActionBarModule,
    ],
    exports: [
    ]
})
export class ClientNotificationsModule {

}