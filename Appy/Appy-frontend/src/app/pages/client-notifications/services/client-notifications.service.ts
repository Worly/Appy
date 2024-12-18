import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";

@Injectable({ providedIn: "root" })
export class ClientNotificationsService {
    private controllerName: string = "clien"

    constructor(private httpClient: HttpClient) { }
}