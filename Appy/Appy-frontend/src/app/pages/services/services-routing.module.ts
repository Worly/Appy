import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { ServiceEditComponent } from "./components/service-edit/service-edit.component";
import { ServicesComponent } from "./components/services/services.component";

const routes: Routes = [
    {
        path: "",
        component: ServicesComponent,
        data: { shouldDetach: true, detachGroup: "services" }
    },
    {
        path: "archive",
        component: ServicesComponent,
        data: { archive: true, shouldDetach: true, detachGroup: "services" }
    },
    {
        path: "edit/:id",
        component: ServiceEditComponent,
        data: { detachGroup: "services" }
    },
    {
        path: "new",
        component: ServiceEditComponent,
        data: { isNew: true, detachGroup: "services" }
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class ServicesRoutingModule { }