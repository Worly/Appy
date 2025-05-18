import { HttpClient, HttpContext } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { catchError, map, Observable, of } from "rxjs";
import { appConfig } from "src/app/app.config";
import { AppointmentView, AppointmentViewDTO } from "src/app/models/appointment";
import { DashboardSettings, DashboardSettingsDTO } from "src/app/models/dashboard-settings";
import { IGNORE_NOT_FOUND } from "src/app/shared/services/errors/error-interceptor.service";

@Injectable({ providedIn: "root" })
export class DashboardService {
    private controllerName: string = "dashboard"

    constructor(private httpClient: HttpClient) { }

    public getSettings(): Observable<DashboardSettings> {
        return this.httpClient.get<DashboardSettingsDTO>(`${appConfig.apiUrl}${this.controllerName}/settings`, {
            context: new HttpContext().set(IGNORE_NOT_FOUND, true)
        }).pipe(
            map(dto => new DashboardSettings(dto)),
            catchError(() => of(new DashboardSettings()))
        )
    }

    public saveSettings(settings: DashboardSettings): Observable<DashboardSettings> {
        return this.httpClient.put<DashboardSettingsDTO>(`${appConfig.apiUrl}${this.controllerName}/settings`, settings.toDTO())
            .pipe(map(dto => new DashboardSettings(dto)));
    }

    public getBookedToday(): Observable<number> {
        return this.httpClient.get<number>(`${appConfig.apiUrl}${this.controllerName}/bookedToday`);
    }

    public getUpcomingUnconfirmed(numberOfDays: number): Observable<AppointmentView[]> {
        return this.httpClient.get<AppointmentViewDTO[]>(`${appConfig.apiUrl}${this.controllerName}/upcomingUnconfirmed`, {
            params: { numberOfDays }
        }).pipe(map(aps => aps.map(a => new AppointmentView(a))));
    }
}