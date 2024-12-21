import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ClientNotificationsSettingsComponent } from "./components/client-notifications-settings/client-notifications-settings.component";

const routes: Routes = [
    {
        path: "",
        component: ClientNotificationsSettingsComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ClientNotificationsRoutingModule { }