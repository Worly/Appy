import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ToggleSwitchComponent } from "./toggle-switch.component";

@NgModule({
    declarations: [
        ToggleSwitchComponent
    ],
    imports: [
        CommonModule,
    ],
    exports: [
        ToggleSwitchComponent
    ]
})
export class ToggleSwitchModule {

}