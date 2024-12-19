import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import { ClientNotificationsSettings, ClientNotificationsSettingsDTO } from "src/app/models/client-notifications-settings";

@Injectable({ providedIn: "root" })
export class ClientNotificationsService {
    private controllerName: string = "clientNotifications"

    constructor(private httpClient: HttpClient) { }

    public getSettings(): Observable<ClientNotificationsSettings> {
        return this.httpClient.get<ClientNotificationsSettingsDTO>(`${appConfig.apiUrl}${this.controllerName}/settings`)
            .pipe(map(dto => new ClientNotificationsSettings(dto)));
    }

    public updateSettings(settings: ClientNotificationsSettings): Observable<ClientNotificationsSettings> {
        return this.httpClient.put<ClientNotificationsSettingsDTO>(`${appConfig.apiUrl}${this.controllerName}/settings`, settings.getDTO())
            .pipe(map(dto => new ClientNotificationsSettings(dto)));
    }
}