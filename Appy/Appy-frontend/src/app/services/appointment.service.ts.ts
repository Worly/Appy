import { Injectable, Injector } from "@angular/core";
import * as moment from "moment";
import { map, Observable } from "rxjs";
import { appConfig } from "../app.config";
import { Appointment, FreeTime, FreeTimeDTO } from "../models/appointment";
import { BaseModelService } from "./base-model-service";

@Injectable({ providedIn: "root" })
export class AppointmentService extends BaseModelService<Appointment> {
    constructor(injector: Injector) {
        super(injector, "appointment", Appointment);
    }

    public override getAll(date?: moment.Moment): Observable<Appointment[]> {
        if (date == null)
            throw "Date cannot be null";

        return this.getAllAdvanced({
            date: date.format("yyyy-MM-DD")
        });
    }

    public getFreeTimes(date: moment.Moment, serviceId: number, duration: moment.Duration, ignoreAppointmentId?: number): Observable<FreeTime[]> {
        let params: any = {
            date: date.format("yyyy-MM-DD"),
            serviceId: serviceId,
            duration: moment.utc(duration.asMilliseconds()).format("HH:mm:ss")
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