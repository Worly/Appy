import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { ButtonModule } from "../button/button.module";
import { TranslateModule } from "../translate/translate.module";
import { SearchComponent } from "./search.component";

@NgModule({
    declarations: [
        SearchComponent
    ],
    imports: [
        CommonModule,
        FormsModule,
        TranslateModule,
        ButtonModule
    ],
    exports: [
        SearchComponent
    ]
})
export class SearchModule {

}