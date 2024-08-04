import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { appConfig } from "src/app/app.config";

@Injectable({ providedIn: "root" })
export class DashboardService {
    private controllerName: string = "dashboard"

    constructor(private httpClient: HttpClient) { }

    public getBookedToday(): Observable<number> {
        return this.httpClient.get<number>(`${appConfig.apiUrl}${this.controllerName}/bookedToday`);
    }
}