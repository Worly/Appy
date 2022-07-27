import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import * as moment from "moment";
import { map, Observable, Subscriber } from "rxjs";
import { appConfig } from "../app.config";
import { Appointment } from "../models/appointment";
import { CalendarDay, CalendarDayDTO } from "../models/calendar-day";
import { AppointmentService } from "./appointment.service.ts";

@Injectable({ providedIn: "root" })
export class CalendarDayService {
    constructor(
        private httpClient: HttpClient,
        private appointmentService: AppointmentService
    ) { }

    public getAll(date: moment.Moment): Observable<CalendarDay> {
        return new Observable<CalendarDay>(s => {
            this.httpClient.get<CalendarDayDTO>(appConfig.apiUrl + "CalendarDay/getAll", {
                params: {
                    date: date.format("yyyy-MM-DD")
                }
            }).subscribe({
                next: c => {
                    let calendarDay = new CalendarDay(c);

                    let dsSub = this.appointmentService.createDatasource(calendarDay.appointments as Appointment[], e => e.date?.isSame(date, "date") == true)
                        .subscribe(n => {
                            if (s.closed) {
                                dsSub.unsubscribe();
                                return;
                            }

                            calendarDay.appointments = n;
                        });

                    s.next(calendarDay);
                },
                error: e => s.error(e)
            });
        });
    }
}