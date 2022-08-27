import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ClientEditComponent } from "./components/client-edit/client-edit.component";
import { ClientsComponent } from "./components/clients/clients.component";

const routes: Routes = [
    {
        path: "",
        component: ClientsComponent,
        data: { shouldDetach: true, detachGroup: "clients" }
    },
    {
        path: "archive",
        component: ClientsComponent,
        data: { archive: true, shouldDetach: true, detachGroup: "clients" }
    },
    {
        path: "edit/:id",
        component: ClientEditComponent,
        data: { detachGroup: "clients" }
    },
    {
        path: "new",
        component: ClientEditComponent,
        data: { isNew: true, detachGroup: "clients" }
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ClientsRoutingModule { }