import { Injectable, Injector } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import { appConfig } from "src/app/app.config";
import { Service } from "src/app/models/service";
import { BaseModelService } from "src/app/shared/services/base-model-service";

@Injectable({ providedIn: "root" })
export class ServiceService extends BaseModelService<Service> {
    constructor(injector: Injector) {
        super(injector, Service.ENTITY_TYPE, Service);
    }

    public override getAll(archived?: boolean): Observable<Service[]> {
        return this.getAllAdvanced({
            archived: !!archived
        }, e => e.isArchived == !!archived);
    }

    public setArchived(service: Service, isArchived: boolean): Observable<Service> {
        return this.httpClient.post<any>(`${appConfig.apiUrl}${this.controllerName}/setArchived/${service.getId()}`, null, { params: { isArchived } })
            .pipe(
                map(s => {
                    let newEntity = new Service(s);

                    this.entityChangeNotifyService.notifyUpdated(newEntity);

                    return newEntity;
                }),
                catchError(e => {
                    if (e?.error?.errors)
                        service.applyServerValidationErrors(e.error.errors);

                    return throwError(() => e);
                }));
    }
}