import { HttpClient, HttpContext, HttpErrorResponse } from "@angular/common/http";
import { Injector } from "@angular/core";
import { catchError, map, Observable, Subscriber, throwError } from "rxjs";
import { appConfig } from "../../app.config";
import { BaseModel } from "../../models/base-model";
import { isEqual } from "lodash-es";
import { IGNORE_NOT_FOUND } from "./errors/error-interceptor.service";

export class BaseModelService<T extends BaseModel> implements IEntityTracker<T> {

    protected httpClient: HttpClient;

    private datasources: Datasource<T>[] = [];

    constructor(
        protected injector: Injector,
        protected controllerName: string,
        private typeFactory: (new (dto?: any) => T)) {

        this.httpClient = this.injector.get(HttpClient);
    }

    private createDatasourceInternal(sub: Subscriber<T[]>, datasourceFilterPredicate?: (entity: T) => boolean): Datasource<T> {
        let dc = new ListDatasource<T>([], sub, datasourceFilterPredicate);
        this.datasources.push(dc);

        return dc;
    }

    private createSingleDatasourceInternal(sub: Subscriber<T>, id: any) {
        let dc = new SingleDatasource<T>([], sub, e => e.getId() == id);
        this.datasources.push(dc);

        return dc;
    }

    public createDatasource(initialData: T[], datasourceFilterPredicate?: (entity: T) => boolean): Observable<T[]> {
        return new Observable<T[]>(s => {
            let ds = this.createDatasourceInternal(s, datasourceFilterPredicate);
            ds.add(initialData);
        });
    }

    public getAll(): Observable<T[]> {
        return this.getAllAdvanced(null);
    }

    public getAllAdvanced(params: any, datasourceFilterPredicate?: (entity: T) => boolean): Observable<T[]> {
        return new Observable<T[]>(s => {
            let datasource = this.createDatasourceInternal(s, datasourceFilterPredicate);

            this.httpClient.get<any[]>(`${appConfig.apiUrl}${this.controllerName}/getAll`, {
                params: params
            }).subscribe({
                next: (r: any[]) => datasource.add(r.map(o => new this.typeFactory(o))),
                error: (e: any) => s.error(e)
            });
        });
    }

    public save(entity: T, params?: any): Observable<T> {
        return this.httpClient.put<any>(`${appConfig.apiUrl}${this.controllerName}/edit/${entity.getId()}`, entity.getDTO(), { params })
            .pipe(
                map(s => {
                    let newEntity = new this.typeFactory(s);

                    this.notifyUpdated(newEntity);

                    return newEntity;
                }),
                catchError(e => {
                    if (e?.error?.errors)
                        entity.applyServerValidationErrors(e.error.errors);

                    return throwError(() => e);
                }));
    }

    public addNew(entity: T, params?: any): Observable<T> {
        return this.httpClient.post<any>(`${appConfig.apiUrl}${this.controllerName}/addNew`, entity.getDTO(), { params })
            .pipe(
                map(s => {
                    let newEntity = new this.typeFactory(s);

                    this.notifyAdded(newEntity);

                    return newEntity;
                }),
                catchError(e => {
                    if (e?.error?.errors)
                        entity.applyServerValidationErrors(e.error.errors);

                    return throwError(() => e);
                }));
    }

    public delete(id: any): Observable<void> {
        return this.httpClient.delete<void>(`${appConfig.apiUrl}${this.controllerName}/delete/${id}`)
            .pipe(map(() => {
                this.notifyDeleted(id);
            }));
    }

    public get(id: any): Observable<T> {
        return this.httpClient.get<any>(`${appConfig.apiUrl}${this.controllerName}/get/${id}`)
            .pipe(map(s => new this.typeFactory(s)));
    }

    public getWithDatasource(id: any): Observable<T | undefined> {
        return new Observable<T>(s => {
            let datasource = this.createSingleDatasourceInternal(s, id);

            let context = new HttpContext().set(IGNORE_NOT_FOUND, true);
            this.httpClient.get<any>(`${appConfig.apiUrl}${this.controllerName}/get/${id}`, { context })
                .pipe(map(s => new this.typeFactory(s)))
                .subscribe({
                    next: (r: T) => datasource.add([r]),
                    error: (e: any) => {
                        if (e instanceof HttpErrorResponse && e.status == 404)
                            datasource.empty();
                        else
                            s.error(e);
                    }
                });
        });
    }

    private getDatasourceContexts(): Datasource<T>[] {
        let contexts = this.datasources.filter(c => !c.isUnsubscribed());

        this.datasources = contexts;
        return contexts;
    }

    public notifyAdded(entity: T): void {
        for (let c of this.getDatasourceContexts())
            c.add([entity]);
    }

    public notifyDeleted(id: any): void {
        for (let c of this.getDatasourceContexts())
            c.delete(id);
    }

    public notifyUpdated(entity: T): void {
        for (let c of this.getDatasourceContexts())
            c.update(entity);
    }
}

export interface IEntityTracker<T extends BaseModel> {
    notifyAdded(entity: T): void;
    notifyDeleted(id: any): void;
    notifyUpdated(entity: T): void;
}

abstract class Datasource<T extends BaseModel> {
    data: T[];
    filterPredicate?: (entity: T) => boolean;

    constructor(data: T[], filterPredicate?: (entity: T) => boolean) {
        this.data = data;
        this.filterPredicate = filterPredicate;
    }

    add(entities: T[]) {
        let newEntities: T[] = [];
        for (let newItem of entities) {
            let oldEntity = this.data.find(o => isEqual(o.getId(), newItem.getId()));
            if (oldEntity == null) {
                if (this.filterPredicate && !this.filterPredicate(newItem))
                    continue;

                newEntities.push(newItem);
            }
            else
                this.update(newItem);
        }

        this.data.splice(0, 0, ...newEntities);

        if (newEntities.length > 0)
            this.notifySubscriber();
    }

    update(entity: T) {
        let oldEntity = this.data.find(o => isEqual(o.getId(), entity.getId()));

        if (oldEntity == null) {
            this.add([entity]);
            return;
        }

        let newSymbols = Object.getOwnPropertySymbols(entity);
        let oldSymbols = Object.getOwnPropertySymbols(oldEntity);

        for (let newSymbol of newSymbols) {
            for (let oldSymbol of oldSymbols) {
                if (newSymbol.description == null)
                    continue;

                if (newSymbol.description.startsWith("#S"))
                    continue;

                if (newSymbol.description == oldSymbol.description) {
                    (oldEntity as any)[oldSymbol] = (entity as any)[newSymbol];
                }
            }
        }

        if (this.filterPredicate && !this.filterPredicate(oldEntity))
            this.data.splice(this.data.indexOf(oldEntity), 1);

        this.notifySubscriber();
    }

    delete(id: any) {
        let index = this.data.findIndex(o => isEqual(o.getId(), id));

        if (index == -1)
            return;

        this.data.splice(index, 1);

        this.notifySubscriber();
    }

    empty() {
        this.data.splice(0, this.data.length);

        this.notifySubscriber();
    }

    abstract notifySubscriber(): void;
    abstract isUnsubscribed(): boolean;
}

class ListDatasource<T extends BaseModel> extends Datasource<T> {
    subscriber: Subscriber<T[]>;

    constructor(data: T[], sub: Subscriber<T[]>, filterPredicate?: (entity: T) => boolean) {
        super(data, filterPredicate);

        this.subscriber = sub;
    }

    notifySubscriber(): void {
        this.subscriber.next([...this.data]);
    }

    isUnsubscribed(): boolean {
        return this.subscriber.closed;
    }
}

class SingleDatasource<T extends BaseModel> extends Datasource<T> {
    subscriber: Subscriber<T>;

    constructor(data: T[], sub: Subscriber<T>, filterPredicate?: (entity: T) => boolean) {
        super(data, filterPredicate);

        this.subscriber = sub;
    }

    notifySubscriber(): void {
        if (this.data.length == 0)
            this.subscriber.next(undefined);
        else if (this.data.length == 1)
            this.subscriber.next(this.data[0]);
        else
            throw new Error("SingleDatasource received more than one element! You have duplicate Ids or wrongly implemented getId() method");
    }

    isUnsubscribed(): boolean {
        return this.subscriber.closed;
    }
}