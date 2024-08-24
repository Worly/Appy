import { Injectable, Injector } from "@angular/core";
import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";
import { map, Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import { Appointment } from "src/app/models/appointment";
import { FreeTime, FreeTimeDTO } from "src/app/models/free-time";
import { BaseModelService, PageableListDatasource } from "src/app/shared/services/base-model-service";
import { SmartFilter } from "src/app/shared/services/smart-filter";

@Injectable({ providedIn: "root" })
export class AppointmentService extends BaseModelService<Appointment> {
    constructor(injector: Injector) {
        super(injector, Appointment.ENTITY_TYPE, Appointment);
    }

    public override getAll(date?: Dayjs): Observable<Appointment[]> {
        if (date == null)
            throw "Date cannot be null";

        return this.getAllAdvanced({
            date: date.format("YYYY-MM-DD")
        }, e => e.date?.isSame(date, "date") == true);
    }

    public getList(date: Dayjs, filter: SmartFilter | undefined, sortPredicate: (a: Appointment, b: Appointment) => number): PageableListDatasource<Appointment> {
        return this.getListAdvanced({
            date: date.format("YYYY-MM-DD")
        }, sortPredicate, filter);
    }

    public getFreeTimes(date: Dayjs, serviceId: number, duration: Duration, ignoreAppointmentId?: number): Observable<FreeTime[]> {
        let params: any = {
            date: date.format("YYYY-MM-DD"),
            serviceId: serviceId,
            duration: duration.format("HH:mm:ss")
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