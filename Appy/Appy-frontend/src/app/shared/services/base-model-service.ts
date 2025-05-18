import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { Injector } from "@angular/core";
import { catchError, map, Observable, Subscriber, throwError } from "rxjs";
import { appConfig } from "../../app.config";
import { BaseModel, EditModel } from "../../models/base-model";
import { EntityChangeNotifyFns, EntityChangeNotifyService } from "./entity-change-notify.service";
import { Datasource, ListDatasource, PageableListDatasource, SingleDatasource } from "./datasource";
import { applySmartFilter, SmartFilter } from "./smart-filter";
import { IGNORE_NOT_FOUND } from "./errors/error-interceptor.service";

export class BaseModelService<T extends EditModel<T>, vT extends BaseModel> {
    protected httpClient: HttpClient;
    protected entityChangeNotifyService: EntityChangeNotifyFns<vT>;

    constructor(
        protected injector: Injector,
        protected controllerName: string,
        protected typeFactory: (new (dto?: any) => T),
        protected viewTypeFactory: (new (dto?: any) => vT)) {

        this.httpClient = this.injector.get(HttpClient);
        this.entityChangeNotifyService = this.injector.get(EntityChangeNotifyService).for(this.controllerName);
    }

    private createListDatasourceInternal(sub: Subscriber<vT[]>, datasourceFilterPredicate?: (entity: vT) => boolean): Datasource<vT> {
        let dc = new ListDatasource<vT>(this.entityChangeNotifyService.subscribeAll, [], sub, datasourceFilterPredicate);

        return dc;
    }

    private createSingleDatasourceInternal(sub: Subscriber<vT>, id: any): Datasource<vT> {
        let dc = new SingleDatasource<vT>(this.entityChangeNotifyService.subscribeAll, [], sub, e => e.getId() == id);

        return dc;
    }

    private createPageableDatasourceInternal(
        loadFunction: (dir: "forwards" | "backwards", skip: number, take: number) => Observable<vT[]>,
        sortPredicate: (a: vT, b: vT) => number,
        filterPredicate?: (e: vT) => boolean): PageableListDatasource<vT> {

        let dc = new PageableListDatasource<vT>(
            this.entityChangeNotifyService.subscribeAll,
            loadFunction,
            sortPredicate,
            filterPredicate
        );

        return dc;
    }

    public createDatasource(initialData: vT[], datasourceFilterPredicate?: (entity: vT) => boolean): Observable<vT[]> {
        return new Observable<vT[]>(s => {
            let ds = this.createListDatasourceInternal(s, datasourceFilterPredicate);
            ds.add(initialData);
        });
    }

    public getAll(): Observable<vT[]> {
        return this.getAllAdvanced(null);
    }

    public getAllAdvanced(params: any, datasourceFilterPredicate?: (entity: vT) => boolean): Observable<vT[]> {
        return new Observable<vT[]>(s => {
            let datasource = this.createListDatasourceInternal(s, datasourceFilterPredicate);

            this.httpClient.get<any[]>(`${appConfig.apiUrl}${this.controllerName}/getAll`, {
                params: params
            }).subscribe({
                next: (r: any[]) => datasource.add(r.map(o => new this.viewTypeFactory(o))),
                error: (e: any) => s.error(e)
            });
        });
    }

    public getListAdvanced(params: any, sortPredicate: (a: vT, b: vT) => number, filter?: SmartFilter, filterPredicate?: (e: vT) => boolean): PageableListDatasource<vT> {
        let loadFunction = (dir: "forwards" | "backwards", skip: number, take: number): Observable<vT[]> => {
            let p = {
                ...params,
                direction: dir,
                skip: skip,
                take: take
            };

            if (filter != null)
                p.filter = JSON.stringify(filter);

            return this.httpClient.get<T[]>(`${appConfig.apiUrl}${this.controllerName}/getList`, {
                params: p
            }).pipe(map(r => r.map(o => new this.viewTypeFactory(o))));
        };

        let filterFunc = (e: vT) => (filter == null || applySmartFilter(e, filter)) && (filterPredicate == null || filterPredicate(e));

        let datasource = this.createPageableDatasourceInternal(loadFunction, sortPredicate, filterFunc);
        datasource.load();

        return datasource;
    }

    public delete(id: any): Observable<void> {
        return this.httpClient.delete<void>(`${appConfig.apiUrl}${this.controllerName}/delete/${id}`)
            .pipe(map(() => {
                this.entityChangeNotifyService.notifyDeleted(id);
            }));
    }

    public getWithDatasource(id: any): Observable<vT | undefined> {
        return new Observable<vT>(s => {
            let datasource = this.createSingleDatasourceInternal(s, id);

            this.httpClient.get<any>(`${appConfig.apiUrl}${this.controllerName}/get/${id}`, {
                context: new HttpContext().set(IGNORE_NOT_FOUND, true)
            })
                .pipe(map(s => new this.viewTypeFactory(s)))
                .subscribe({
                    next: (r: vT) => datasource.add([r]),
                    error: (e: any) => {
                        if (e instanceof HttpErrorResponse && e.status == 404)
                            datasource.empty();
                        else
                            s.error(e);
                    }
                });
        });
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

                this.entityChangeNotifyService.notifyUpdated(newEntity);

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

                this.entityChangeNotifyService.notifyAdded(newEntity);

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
