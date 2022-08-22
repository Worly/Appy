import { OverlayModule } from "@angular/cdk/overlay";
import { NgModule } from "@angular/core";
import { ContextMenuComponent } from "./context-menu.component";
import { ElementRefDirective } from "./directives/element-ref.directive";

@NgModule({
    declarations: [
        ContextMenuComponent,
        ElementRefDirective,
    ],
    imports: [
        OverlayModule
    ],
    exports: [
        ContextMenuComponent,
        ElementRefDirective
    ]
})
export class ContextMenuModule {

}