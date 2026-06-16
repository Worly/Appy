import { Injectable, Injector } from "@angular/core";
import { Dayjs } from "dayjs";
import { map, Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import { TimeOff, TimeOffListType, TimeOffScope } from "src/app/models/time-off";
import { TimeOffOccurrence, TimeOffOccurrenceDTO } from "src/app/models/time-off-occurrence";
import { BaseModelService } from "src/app/shared/services/base-model-service";
import { appointmentKeys, timeOffKeys } from "src/app/shared/services/data/keys";
import { PagedResult } from "src/app/shared/services/data/contracts";

@Injectable({ providedIn: "root" })
export class TimeOffService extends BaseModelService<TimeOff, TimeOff> {
  constructor(injector: Injector) {
    super(injector, TimeOff.ENTITY_TYPE, TimeOff, TimeOff, timeOffKeys, [appointmentKeys.all]);
  }

  public getForDate(date: Dayjs): Observable<TimeOffOccurrence[]> {
    return this.httpClient.get<TimeOffOccurrenceDTO[]>(`${appConfig.apiUrl}${this.controllerName}/getForDate`, {
      params: { date: date.format("YYYY-MM-DD") }
    }).pipe(map(r => r.map(o => new TimeOffOccurrence(o))));
  }

  public getList(type: TimeOffListType, scope: TimeOffScope): PagedResult<TimeOff, never> {
    return this.getListAdvanced<never>(
      [...timeOffKeys.list(type, scope)],
      { type, scope });
  }
}
