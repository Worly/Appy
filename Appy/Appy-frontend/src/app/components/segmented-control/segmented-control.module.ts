import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { ButtonModule } from "../button/button.module";
import { TranslateModule } from "../translate/translate.module";
import { SegmentedControlComponent } from "./segmented-control.component";

@NgModule({
  declarations: [SegmentedControlComponent],
  imports: [CommonModule, ButtonModule, TranslateModule],
  exports: [SegmentedControlComponent],
})
export class SegmentedControlModule { }
