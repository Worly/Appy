import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import { Appointment, AppointmentDTO } from "src/app/models/appointment";

@Injectable({ providedIn: "root" })
export class DashboardService {
    private controllerName: string = "dashboard"

    constructor(private httpClient: HttpClient) { }

    public getBookedToday(): Observable<number> {
        return this.httpClient.get<number>(`${appConfig.apiUrl}${this.controllerName}/bookedToday`);
    }

    public getUpcomingUnconfirmed(): Observable<Appointment[]> {
        return this.httpClient.get<AppointmentDTO[]>(`${appConfig.apiUrl}${this.controllerName}/upcomingUnconfirmed`)
            .pipe(map(aps => aps.map(a => new Appointment(a))));
    }
}