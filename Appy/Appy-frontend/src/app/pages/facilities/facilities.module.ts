import { HTTP_INTERCEPTORS } from "@angular/common/http";
import { NgModule } from "@angular/core";
import { ContextMenuModule } from "src/app/components/context-menu/context-menu.module";
import { DialogModule } from "src/app/components/dialog/dialog.module";
import { FacilityInterceptor } from "src/app/pages/facilities/services/facility-interceptor.service";
import { SharedModule } from "src/app/shared/shared.module";
import { FacilitiesComponent } from "./components/facilities/facilities.component";
import { SelectedFacilityComponent } from "./components/selected-facility/selected-facility.component";
import { FacilityEditComponent } from "./components/single-facility/facility-edit/facility-edit.component";
import { SingleFacilityComponent } from "./components/single-facility/single-facility.component";
@NgModule({
    declarations: [
        SelectedFacilityComponent,
        FacilitiesComponent,
        SingleFacilityComponent,
        FacilityEditComponent
    ],
    imports: [
        SharedModule,

        DialogModule,
        ContextMenuModule
    ],
    exports: [
        SelectedFacilityComponent
    ],
    providers: [
        { provide: HTTP_INTERCEPTORS, useClass: FacilityInterceptor, multi: true },
    ]
})
export class FacilitiesModule {

}