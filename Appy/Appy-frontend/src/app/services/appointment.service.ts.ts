import { Injectable, Injector } from "@angular/core";
import { map, Observable } from "rxjs";
import { appConfig } from "../app.config";
import { Appointment } from "../models/appointment";
import { FreeTime, FreeTimeDTO } from "../models/free-time";
import { BaseModelService } from "./base-model-service";
import { Moment, Duration, utc } from "moment";

@Injectable({ providedIn: "root" })
export class AppointmentService extends BaseModelService<Appointment> {
    constructor(injector: Injector) {
        super(injector, "appointment", Appointment);
    }

    public override getAll(date?: Moment): Observable<Appointment[]> {
        if (date == null)
            throw "Date cannot be null";

        return this.getAllAdvanced({
            date: date.format("yyyy-MM-DD")
        }, e => e.date?.isSame(date, "date") == true);
    }

    public getFreeTimes(date: Moment, serviceId: number, duration: Duration, ignoreAppointmentId?: number): Observable<FreeTime[]> {
        let params: any = {
            date: date.format("yyyy-MM-DD"),
            serviceId: serviceId,
            duration: utc(duration.asMilliseconds()).format("HH:mm:ss")
        }

        if (ignoreAppointmentId != null)
            params.ignoreAppointmentId = ignoreAppointmentId;

        return this.httpClient.get<FreeTimeDTO[]>(`${appConfig.apiUrl}${this.controllerName}/getFreeTimes`, {
            params: params
        }).pipe(
            map(t => t.map(o => new FreeTime(o)))
        );
    }
}