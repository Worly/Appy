import { Injectable, Injector } from "@angular/core";
import * as moment from "moment";
import { Observable } from "rxjs";
import { Appointment } from "../models/appointment";
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
}