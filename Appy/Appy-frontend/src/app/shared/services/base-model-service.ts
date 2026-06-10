import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { Injector } from "@angular/core";
import { catchError, map, Observable, of, throwError } from "rxjs";
import { QueryClient } from "@tanstack/query-core";
import { appConfig } from "../../app.config";
import { BaseModel, EditModel } from "../../models/base-model";
import { applySmartFilter, SmartFilter } from "./smart-filter";
import { IGNORE_NOT_FOUND } from "./errors/error-interceptor.service";
import { CacheCoordinator, CacheKey } from "./data/cache-coordinator";
import { PagedResult, QueryResult } from "./data/contracts";
import { query } from "./data/query";
import { pagedQuery } from "./data/paged-query";

export class BaseModelService<T extends EditModel<T>, vT extends BaseModel> {
    protected httpClient: HttpClient;
    protected cache: CacheCoordinator;
    protected queryClient: QueryClient;

    constructor(
        protected injector: Injector,
        protected controllerName: string,
        protected typeFactory: (new (dto?: any) => T),
        protected viewTypeFactory: (new (dto?: any) => vT),
        /**
         * Keys this entity's mutations invalidate. No-op today (see CacheCoordinator), but
         * declared now — including cross-entity dependencies (e.g. a client edit lists
         * appointmentKeys.all because appointments embed the client).
         */
        protected mutationKeys: CacheKey[] = []) {

        this.httpClient = this.injector.get(HttpClient);
        this.cache = this.injector.get(CacheCoordinator);
        this.queryClient = this.injector.get(QueryClient);
    }

    public getAll(): QueryResult<vT[]> {
        return this.getAllAdvanced(this.allListKey(), null);
    }

    public getAllAdvanced(queryKey: CacheKey, params: any): QueryResult<vT[]> {
        return query(this.queryClient, queryKey, () =>
            this.httpClient.get<any[]>(`${appConfig.apiUrl}${this.controllerName}/getAll`, { params })
                .pipe(map(r => r.map(o => new this.viewTypeFactory(o)))));
    }

    public getListAdvanced(queryKey: CacheKey, params: any, sortPredicate: (a: vT, b: vT) => number, filter?: SmartFilter, filterPredicate?: (e: vT) => boolean): PagedResult<vT> {
        let loadPage = (dir: "forwards" | "backwards", skip: number, take: number): Observable<vT[]> => {
            let p = {
                ...params,
                direction: dir,
                skip: skip,
                take: take
            };

            if (filter != null)
                p.filter = JSON.stringify(filter);

            return this.httpClient.get<any[]>(`${appConfig.apiUrl}${this.controllerName}/getList`, { params: p })
                .pipe(map(r => r.map(o => new this.viewTypeFactory(o))));
        };

        let filterFunc = (e: vT) => (filter == null || applySmartFilter(e, filter)) && (filterPredicate == null || filterPredicate(e));

        return pagedQuery<vT>(this.queryClient, { queryKey, loadPage, sort: sortPredicate, filter: filterFunc });
    }

    /** Key for the default getAll() list fetch. Subclasses with a discriminator (archived/date) override getAll() and pass a list(...) key instead. */
    protected allListKey(): CacheKey {
        return this.mutationKeys[0] ?? [];
    }

    public delete(id: any): Observable<void> {
        return this.httpClient.delete<void>(`${appConfig.apiUrl}${this.controllerName}/delete/${id}`)
            .pipe(map(() => {
                this.cache.invalidate(...this.mutationKeys);
            }));
    }

    /** Single-entity fetch. `data$` emits `undefined` when the entity is not found (404). */
    public getById(queryKey: CacheKey, id: any): QueryResult<vT | undefined> {
        const q = query<vT | null>(this.queryClient, queryKey, () =>
            this.httpClient.get<any>(`${appConfig.apiUrl}${this.controllerName}/get/${id}`, {
                context: new HttpContext().set(IGNORE_NOT_FOUND, true)
            }).pipe(
                map(s => new this.viewTypeFactory(s) as vT),
                catchError(e => {
                    if (e instanceof HttpErrorResponse && e.status == 404)
                        return of(null); // TanStack queryFn must not resolve `undefined`
                    return throwError(() => e);
                })));

        return {
            data$: q.data$.pipe(map(d => d ?? undefined)),
            loading$: q.loading$,
            error$: q.error$,
            refetch: q.refetch,
        };
    }

    public get(id: any): Observable<T> {
        return this.httpClient.get<any>(`${appConfig.apiUrl}${this.controllerName}/get/${id}`)
            .pipe(map(s => new this.typeFactory(s)));
    }

    public saveWithHeaders(entity: T, params?: any): Observable<{ model: vT, headers: HttpHeaders }> {
        return this.httpClient.put<any>(`${appConfig.apiUrl}${this.controllerName}/edit/${entity.getId()}`, entity.getDTO(), {
            observe: "response",
            params: params
        }).pipe(
            map(r => {
                let newEntity = new this.viewTypeFactory(r.body);

                this.cache.invalidate(...this.mutationKeys);

                return { model: newEntity, headers: r.headers };
            }),
            catchError(e => {
                if (e?.error?.errors)
                    entity.applyServerValidationErrors(e.error.errors);

                return throwError(() => e);
            }));
    }

    public save(entity: T, params?: any): Observable<vT> {
        return this.saveWithHeaders(entity, params).pipe(map(r => r.model));
    }

    public addNewWithHeaders(entity: T, params?: any): Observable<{ model: vT, headers: HttpHeaders }> {
        return this.httpClient.post<any>(`${appConfig.apiUrl}${this.controllerName}/addNew`, entity.getDTO(), {
            observe: "response",
            params: params
        }).pipe(
            map(r => {
                let newEntity = new this.viewTypeFactory(r.body);

                this.cache.invalidate(...this.mutationKeys);

                return { model: newEntity, headers: r.headers };
            }),
            catchError(e => {
                if (e?.error?.errors)
                    entity.applyServerValidationErrors(e.error.errors);

                return throwError(() => e);
            }));
    }

    public addNew(entity: T, params?: any): Observable<vT> {
        return this.addNewWithHeaders(entity, params).pipe(map(r => r.model));
    }
}
