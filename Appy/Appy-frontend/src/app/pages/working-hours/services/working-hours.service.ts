import { Injectable, Injector } from "@angular/core";
import { catchError, Observable, throwError } from "rxjs";
import { appConfig } from "src/app/app.config";
import { WorkingHour } from "src/app/models/working-hours";
import { BaseModelService } from "src/app/shared/services/base-model-service";

@Injectable({ providedIn: "root" })
export class WorkingHoursService extends BaseModelService<WorkingHour> {
    constructor(injector: Injector) {
        super(injector, WorkingHour.ENTITY_TYPE, WorkingHour);
    }

    public set(workingHours: WorkingHour[]): Observable<void> {
        return this.httpClient.post<void>(`${appConfig.apiUrl}${this.controllerName}/set`, workingHours.map(w => w.getDTO()))
            .pipe(
                catchError(e => {
                    if (e?.error?.errors)
                        workingHours.forEach(wh => wh.applyServerValidationErrors(e.error.errors));

                    return throwError(() => e);
                }));
    }
}