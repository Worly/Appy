import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ActionBarComponent } from "./action-bar.component";
import { FlexSplitterDirective } from "./directives/flex-splitter.directive";

@NgModule({
    declarations: [
        ActionBarComponent,
        FlexSplitterDirective
    ],
    imports: [
        CommonModule
    ],
    exports: [
        ActionBarComponent,
        FlexSplitterDirective
    ]
})
export class ActionBarModule {

}