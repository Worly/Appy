import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { SharedModule } from "src/app/shared/shared.module";
import { RegisterComponent } from "./register.component";

@NgModule({
    declarations: [
        RegisterComponent
    ],
    imports: [
        SharedModule,

        RouterModule
    ],
    exports: [
        RegisterComponent
    ]
})
export class RegisterModule {

}