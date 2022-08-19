import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Dayjs } from "dayjs";
import { Observable, takeUntil } from "rxjs";
import { appConfig } from "../app.config";
import { Appointment } from "../models/appointment";
import { CalendarDay, CalendarDayDTO } from "../models/calendar-day";
import { onUnsubscribed } from "../utils/smart-subscriber";
import { AppointmentService } from "./appointment.service.ts";

@Injectable({ providedIn: "root" })
export class CalendarDayService {
    constructor(
        private httpClient: HttpClient,
        private appointmentService: AppointmentService
    ) { }

    public getAll(date: Dayjs): Observable<CalendarDay> {
        return new Observable<CalendarDay>(s => {
            this.httpClient.get<CalendarDayDTO>(appConfig.apiUrl + "CalendarDay/getAll", {
                params: {
                    date: date.format("YYYY-MM-DD")
                }
            }).pipe(takeUntil(onUnsubscribed(s)))
                .subscribe({
                    next: c => {
                        let calendarDay = new CalendarDay(c);

                        this.appointmentService.createDatasource(calendarDay.appointments as Appointment[], e => e.date?.isSame(date, "date") == true)
                            .pipe(takeUntil(onUnsubscribed(s)))
                            .subscribe(n => {
                                calendarDay.appointments = n;
                                s.next(calendarDay);
                            });

                        s.next(calendarDay);
                    },
                    error: e => s.error(e)
                });
        });
    }
}