import { Injectable, Injector } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import { appConfig } from "src/app/app.config";
import { Service } from "src/app/models/service";
import { BaseModelService } from "src/app/shared/services/base-model-service";
import { QueryResult } from "src/app/shared/services/data/contracts";
import { appointmentKeys, serviceKeys } from "src/app/shared/services/data/keys";

@Injectable({ providedIn: "root" })
export class ServiceService extends BaseModelService<Service, Service> {
    constructor(injector: Injector) {
        // Appointments embed the service, so service mutations invalidate appointments too.
        super(injector, Service.ENTITY_TYPE, Service, Service, [serviceKeys.all, appointmentKeys.all]);
    }

    public override getAll(archived?: boolean): QueryResult<Service[]> {
        return this.getAllAdvanced({
            archived: !!archived
        });
    }

    public setArchived(service: Service, isArchived: boolean): Observable<Service> {
        return this.httpClient.post<any>(`${appConfig.apiUrl}${this.controllerName}/setArchived/${service.getId()}`, null, { params: { isArchived } })
            .pipe(
                map(s => {
                    let newEntity = new Service(s);

                    this.cache.invalidate(...this.mutationKeys);

                    return newEntity;
                }),
                catchError(e => {
                    if (e?.error?.errors)
                        service.applyServerValidationErrors(e.error.errors);

                    return throwError(() => e);
                }));
    }
}