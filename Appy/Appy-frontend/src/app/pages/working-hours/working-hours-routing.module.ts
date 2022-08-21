import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { WorkingHoursComponent } from "./components/working-hours.component";

const routes: Routes = [
    {
        path: "",
        component: WorkingHoursComponent,
    },
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class WorkingHoursRoutingModule { }