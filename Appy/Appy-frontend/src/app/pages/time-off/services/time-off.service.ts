import { Injectable, Injector } from "@angular/core";
import { Dayjs } from "dayjs";
import { map, Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import { TimeOff, TimeOffListType, TimeOffScope } from "src/app/models/time-off";
import { BaseModelService } from "src/app/shared/services/base-model-service";
import { appointmentKeys, timeOffKeys } from "src/app/shared/services/data/keys";
import { PagedResult } from "src/app/shared/services/data/contracts";

@Injectable({ providedIn: "root" })
export class TimeOffService extends BaseModelService<TimeOff, TimeOff> {
  constructor(injector: Injector) {
    super(injector, TimeOff.ENTITY_TYPE, TimeOff, TimeOff, timeOffKeys, [appointmentKeys.all]);
  }

  /**
   * Save an edit, optionally forking a recurring rule's timeline. When `applyFrom` is given the
   * backend keeps the original row as history (ending the day before) and writes a new segment
   * from `applyFrom` onward; without it, this is a plain in-place edit.
   */
  public saveWithSplit(timeOff: TimeOff, applyFrom?: Dayjs): Observable<TimeOff> {
    return this.save(timeOff, applyFrom ? { applyFrom: applyFrom.format("YYYY-MM-DD") } : undefined);
  }

  /**
   * Stop a recurring rule going forward (backend clamps its end to yesterday, keeping history).
   * Mirrors `delete`'s shape — fire-and-forget, invalidating the same keys so the rule drops from
   * the Active list into Past and the appointment views refresh.
   */
  public stop(id: any): Observable<void> {
    return this.httpClient.put<void>(`${appConfig.apiUrl}${this.controllerName}/stop/${id}`, null)
      .pipe(map(() => {
        this.cache.invalidate(...this.mutationKeys);
      }));
  }

  public getList(type: TimeOffListType, scope: TimeOffScope): PagedResult<TimeOff, never> {
    return this.getListAdvanced<never>(
      [...timeOffKeys.list(type, scope)],
      { type, scope });
  }
}
