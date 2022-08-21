import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FontAwesomeModule } from "@fortawesome/angular-fontawesome";
import { ButtonComponent } from "./button.component";

@NgModule({
    declarations: [
        ButtonComponent
    ],
    imports: [
        CommonModule,
        FontAwesomeModule,
    ],
    exports: [
        ButtonComponent
    ]
})
export class ButtonModule {

}