import { Injectable, Injector } from "@angular/core";
import { catchError, Observable, throwError } from "rxjs";
import { appConfig } from "../app.config";
import { WorkingHour } from "../models/working-hours";
import { BaseModelService } from "./base-model-service";

@Injectable({ providedIn: "root" })
export class WorkingHoursService extends BaseModelService<WorkingHour> {
    constructor(injector: Injector) {
        super(injector, "workingHour", WorkingHour);
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