import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Dayjs } from "dayjs";
import { Observable, takeUntil } from "rxjs";
import { appConfig } from "src/app/app.config";
import { Appointment } from "src/app/models/appointment";
import { CalendarDay, CalendarDayDTO } from "src/app/models/calendar-day";
import { AppointmentService } from "./appointment.service.ts";
import { onUnsubscribed } from "src/app/utils/smart-subscriber";

@Injectable()
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