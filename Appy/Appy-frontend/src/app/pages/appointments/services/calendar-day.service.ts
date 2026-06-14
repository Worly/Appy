import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Dayjs } from "dayjs";
import { map, Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import { CalendarDay, CalendarDayDTO } from "src/app/models/calendar-day";
import { SmartFilter } from "src/app/shared/services/smart-filter";

@Injectable({ providedIn: "root" })
export class CalendarDayService {
    constructor(
        private httpClient: HttpClient
    ) { }

    public getAll(date: Dayjs, filter: SmartFilter | undefined): Observable<CalendarDay> {
        let p: any = {
            date: date.format("YYYY-MM-DD")
        };

        if (filter != null)
            p.filter = JSON.stringify(filter);

        return this.httpClient.get<CalendarDayDTO>(appConfig.apiUrl + "CalendarDay/getAll", {
            params: p
        }).pipe(map(c => new CalendarDay(c)));
    }
}
