import { NgModule } from "@angular/core";
import { ContextMenuComponent } from "./context-menu.component";
import { ElementRefDirective } from "./directives/element-ref.directive";

@NgModule({
    declarations: [
        ContextMenuComponent,
        ElementRefDirective,
    ],
    imports: [
        
    ],
    exports: [
        ContextMenuComponent,
        ElementRefDirective
    ]
})
export class ContextMenuModule {

}