import { Injectable, Injector } from "@angular/core";
import { catchError, map, Observable, throwError } from "rxjs";
import { appConfig } from "src/app/app.config";
import { Client } from "src/app/models/client";
import { BaseModelService } from "src/app/shared/services/base-model-service";
import { QueryResult } from "src/app/shared/services/data/contracts";
import { appointmentKeys, clientKeys } from "src/app/shared/services/data/keys";

@Injectable({ providedIn: "root" })
export class ClientService extends BaseModelService<Client, Client> {
    constructor(injector: Injector) {
        // Appointments embed the client, so client mutations invalidate appointments too.
        super(injector, Client.ENTITY_TYPE, Client, Client, [clientKeys.all, appointmentKeys.all]);
    }

    public override getAll(archived?: boolean): QueryResult<Client[]> {
        return this.getAllAdvanced(clientKeys.list(!!archived), {
            archived: !!archived
        });
    }

    public setArchived(client: Client, isArchived: boolean): Observable<Client> {
        return this.httpClient.post<any>(`${appConfig.apiUrl}${this.controllerName}/setArchived/${client.getId()}`, null, { params: { isArchived } })
            .pipe(
                map(s => {
                    let newEntity = new Client(s);

                    this.cache.invalidate(...this.mutationKeys);

                    return newEntity;
                }),
                catchError(e => {
                    if (e?.error?.errors)
                        client.applyServerValidationErrors(e.error.errors);

                    return throwError(() => e);
                }));
    }
}