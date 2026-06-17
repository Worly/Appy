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

  /**
   * Save an edit, optionally forking a recurring rule's timeline. When `applyFrom` is given the
   * backend keeps the original row as history (ending the day before) and writes a new segment
   * from `applyFrom` onward; without it, this is a plain in-place edit.
   */
  public saveWithSplit(timeOff: TimeOff, applyFrom?: Dayjs): Observable<TimeOff> {
    return this.save(timeOff, applyFrom ? { applyFrom: applyFrom.format("YYYY-MM-DD") } : undefined);
  }

  public getList(type: TimeOffListType, scope: TimeOffScope): PagedResult<TimeOff, never> {
    return this.getListAdvanced<never>(
      [...timeOffKeys.list(type, scope)],
      { type, scope });
  }
}
