import { Injectable, Injector } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { QueryClient } from "@tanstack/query-core";
import { map, Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import { TimeOffScope } from "src/app/models/time-off";
import {
  Holiday, HolidayDTO, HolidayImportSettings, HolidayImportSettingsDTO,
  HolidayListItem, HolidayListDTO, SupportedCountry,
} from "src/app/models/holiday";
import { CacheCoordinator } from "src/app/shared/services/data/cache-coordinator";
import { PagedResult, QueryResult } from "src/app/shared/services/data/contracts";
import { query } from "src/app/shared/services/data/query";
import { pagedQuery } from "src/app/shared/services/data/paged-query";
import { appointmentKeys, holidayKeys, timeOffKeys } from "src/app/shared/services/data/keys";

@Injectable({ providedIn: "root" })
export class HolidayService {
  private readonly controllerName = "holiday";

  private httpClient: HttpClient;
  private queryClient: QueryClient;
  private cache: CacheCoordinator;

  constructor(injector: Injector) {
    this.httpClient = injector.get(HttpClient);
    this.queryClient = injector.get(QueryClient);
    this.cache = injector.get(CacheCoordinator);
  }

  public getList(scope: TimeOffScope): PagedResult<HolidayListItem, never> {
    return pagedQuery<HolidayListItem, never>(this.queryClient, {
      queryKey: [...holidayKeys.list(scope)],
      loadPage: (direction, skip, take) =>
        this.httpClient.get<HolidayListDTO[]>(`${appConfig.apiUrl}${this.controllerName}/getList`, {
          params: { scope, skip, take, direction },
        }).pipe(map(r => ({ items: r.map(d => new HolidayListItem(d)), extra: [] as never[] }))),
    });
  }

  // The original provider snapshot never changes, so this caches cleanly by id.
  public getById(id: number): QueryResult<Holiday> {
    return query(this.queryClient, [...holidayKeys.detail(id)], () =>
      this.httpClient.get<HolidayDTO>(`${appConfig.apiUrl}${this.controllerName}/get/${id}`)
        .pipe(map(d => new Holiday(d))));
  }

  public getSettings(): QueryResult<HolidayImportSettings> {
    return query(this.queryClient, [...holidayKeys.settings], () =>
      this.httpClient.get<HolidayImportSettingsDTO>(`${appConfig.apiUrl}${this.controllerName}/settings`)
        .pipe(map(dto => new HolidayImportSettings(dto))));
  }

  public saveSettings(settings: HolidayImportSettings): Observable<HolidayImportSettings> {
    return this.httpClient.put<HolidayImportSettingsDTO>(`${appConfig.apiUrl}${this.controllerName}/settings`, settings.getDTO())
      .pipe(map(dto => {
        const saved = new HolidayImportSettings(dto);
        this.cache.invalidate(holidayKeys.all, timeOffKeys.all, appointmentKeys.all);
        // Write the saved settings straight into the cache: the invalidation above marks the settings
        // query stale but keeps its now-outdated data, which the configure dialog would otherwise read
        // (first emission) the next time it opens.
        this.queryClient.setQueryData([...holidayKeys.settings], saved);
        return saved;
      }));
  }

  public getSupportedCountries(): QueryResult<SupportedCountry[]> {
    return query(this.queryClient, [...holidayKeys.countries], () =>
      this.httpClient.get<SupportedCountry[]>(`${appConfig.apiUrl}${this.controllerName}/getSupportedCountries`));
  }

  public revert(id: number): Observable<void> { return this.mutate(`revert/${id}`, null); }
  public restore(id: number): Observable<void> { return this.mutate(`restore/${id}`, null); }

  private mutate(path: string, body: any): Observable<void> {
    return this.httpClient.put<void>(`${appConfig.apiUrl}${this.controllerName}/${path}`, body)
      .pipe(map(() => { this.cache.invalidate(holidayKeys.all, timeOffKeys.all, appointmentKeys.all); }));
  }
}
