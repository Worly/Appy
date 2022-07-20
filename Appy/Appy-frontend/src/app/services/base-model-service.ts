import { HttpClient } from "@angular/common/http";
import { Injector } from "@angular/core";
import { catchError, map, Observable, Subscriber, throwError } from "rxjs";
import { appConfig } from "../app.config";
import { BaseModel } from "../models/base-model";
import * as _ from "lodash";


export class BaseModelService<T extends BaseModel> implements IEntityTracker<T> {

    protected httpClient: HttpClient;

    private datasourceContexts: DatasourceContext<T>[] = [];

    constructor(
        protected injector: Injector,
        protected controllerName: string,
        private typeFactory: (new (dto?: any) => T)) {

        this.httpClient = this.injector.get(HttpClient);
    }

    private createDatasourceContext(sub: Subscriber<T[]>): DatasourceContext<T> {
        let dc = new DatasourceContext<T>([], sub);
        this.datasourceContexts.push(dc);

        return dc;
    }

    public getAll(): Observable<T[]> {
        return this.getAllAdvanced(null);
    }

    public getAllAdvanced(params: any): Observable<T[]> {
        return new Observable<T[]>(s => {
            let datasourceContext = this.createDatasourceContext(s);

            this.httpClient.get<any[]>(`${appConfig.apiUrl}${this.controllerName}/getAll`, {
                params: params
            }).subscribe({
                next: (r: any[]) => datasourceContext.add(r.map(o => new this.typeFactory(o))),
                error: (e: any) => s.error(s)
            });
        });
    }

    public save(entity: T): Observable<T> {
        return this.httpClient.put<any>(`${appConfig.apiUrl}${this.controllerName}/edit/${entity.getId()}`, entity.getDTO())
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

    public addNew(entity: T): Observable<T> {
        return this.httpClient.post<any>(`${appConfig.apiUrl}${this.controllerName}/addNew`, entity.getDTO())
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

    private getDatasourceContexts(): DatasourceContext<T>[] {
        let contexts = this.datasourceContexts.filter(c => !c.subscriber.closed);

        this.datasourceContexts = contexts;
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

class DatasourceContext<T extends BaseModel> {
    datasource: T[];
    subscriber: Subscriber<T[]>;

    constructor(datasource: T[], subscriber: Subscriber<T[]>) {
        this.datasource = datasource;
        this.subscriber = subscriber;
    }

    add(entities: T[]) {
        let newEntities: T[] = [];
        for (let newItem of entities) {
            let oldEntity = this.datasource.find(o => _.isEqual(o.getId(), newItem.getId()));
            if (oldEntity == null)
                newEntities.push(newItem);
            else
                this.update(newItem);
        }

        this.datasource.splice(0, 0, ...newEntities);

        this.subscriber.next(this.datasource);
    }

    update(entity: T) {
        let oldEntity = this.datasource.find(o => _.isEqual(o.getId(), entity.getId()));

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

        this.subscriber.next(this.datasource);
    }

    delete(id: any) {
        let index = this.datasource.findIndex(o => _.isEqual(o.getId(), id));

        if (index == -1)
            return;

        this.datasource.splice(index, 1);

        this.subscriber.next(this.datasource);
    }
}