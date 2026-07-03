import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import { TimeOffComponent } from "./components/time-off/time-off.component";
import { TimeOffEditComponent } from "./components/time-off-edit/time-off-edit.component";

const routes: Routes = [
  { path: "", component: TimeOffComponent },
  { path: "new", component: TimeOffEditComponent },
  { path: "edit/:id", component: TimeOffEditComponent },
  { path: "holiday/edit/:id", component: TimeOffEditComponent, data: { holiday: true } },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class TimeOffRoutingModule { }
