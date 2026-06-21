import { OverlayModule } from "@angular/cdk/overlay";
import { NgModule } from "@angular/core";
import { ButtonModule } from "../button/button.module";
import { ContextMenuComponent } from "./context-menu.component";
import { ElementRefDirective } from "./directives/element-ref.directive";

@NgModule({
    declarations: [
        ContextMenuComponent,
        ElementRefDirective,
    ],
    imports: [
        OverlayModule,
        ButtonModule
    ],
    exports: [
        ContextMenuComponent,
        ElementRefDirective
    ]
})
export class ContextMenuModule {

}