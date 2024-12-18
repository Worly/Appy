import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { ClientNotificationsSettingsComponent } from "./components/client-notifications-settings/client-notifications-settings.component";
import { ClientNotificationsRoutingModule } from "./client-notifications-routing.module";

@NgModule({
    declarations: [
        ClientNotificationsSettingsComponent,
    ],
    imports: [
        ClientNotificationsRoutingModule,
        SharedModule,
    ],
    exports: [
    ]
})
export class ClientNotificationsModule {

}