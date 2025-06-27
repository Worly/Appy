import { Injectable, Injector } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import { appConfig } from "src/app/app.config";
import { Client } from "src/app/models/client";
import { BaseModelService } from "src/app/shared/services/base-model-service";

@Injectable({ providedIn: "root" })
export class ClientService extends BaseModelService<Client, Client> {
    constructor(injector: Injector) {
        super(injector, Client.ENTITY_TYPE, Client, Client);
    }

    public override getAll(archived?: boolean): Observable<Client[]> {
        return this.getAllAdvanced({
            archived: !!archived
        }, e => e.isArchived == !!archived);
    }

    public setArchived(client: Client, isArchived: boolean): Observable<Client> {
        return this.httpClient.post<any>(`${appConfig.apiUrl}${this.controllerName}/setArchived/${client.getId()}`, null, { params: { isArchived } })
            .pipe(
                map(s => {
                    let newEntity = new Client(s);

                    this.entityChangeNotifyService.notifyUpdated(newEntity)

                    return newEntity;
                }),
                catchError(e => {
                    if (e?.error?.errors)
                        client.applyServerValidationErrors(e.error.errors);

                    return throwError(() => e);
                }));
    }
}