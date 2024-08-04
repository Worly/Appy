import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import { DashboardStats } from "../dashboard-stats";

@Injectable({ providedIn: "root" })
export class DashboardService {
    private controllerName: string = "dashboard"

    constructor(private httpClient: HttpClient) { }

    public getStats(): Observable<DashboardStats> {
        return this.httpClient.get<DashboardStats>(`${appConfig.apiUrl}${this.controllerName}/stats`);
    }
}