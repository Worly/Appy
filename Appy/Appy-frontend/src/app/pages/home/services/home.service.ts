import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import { HomeStats } from "../home-stats";

@Injectable({ providedIn: "root" })
export class HomeService {
    private controllerName: string = "home"

    constructor(private httpClient: HttpClient) { }

    public getStats(): Observable<HomeStats> {
        return this.httpClient.get<HomeStats>(`${appConfig.apiUrl}${this.controllerName}/stats`);
    }
}