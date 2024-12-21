import { HttpClient, HttpContext, HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { Injector } from "@angular/core";
import { catchError, map, Observable, Observer, Subscriber, Subscription, take, throwError } from "rxjs";
import { appConfig } from "../../app.config";
import { Model } from "../../models/base-model";
import { isEqual } from "lodash-es";
import { IGNORE_NOT_FOUND } from "./errors/error-interceptor.service";
import { getInsertIndex, isSorted } from "src/app/utils/array-utils";
import { applySmartFilter, SmartFilter } from "./smart-filter";
import { EntityChangeNotifyFns, EntityChangeNotifyPredicates, EntityChangeNotifyService } from "./entity-change-notify.service";
import { onUnsubscribed } from "src/app/utils/smart-subscriber";

export class BaseModelService<T extends Model<T>> {

    protected httpClient: HttpClient;
    protected entityChangeNotifyService: EntityChangeNotifyFns<T>;

    constructor(
        protected injector: Injector,
        protected controllerName: string,
        private typeFactory: (new (dto?: any) => T)) {

        this.httpClient = this.injector.get(HttpClient);
        this.entityChangeNotifyService = this.injector.get(EntityChangeNotifyService).for(this.controllerName);
    }

    private createListDatasourceInternal(sub: Subscriber<T[]>, datasourceFilterPredicate?: (entity: T) => boolean): Datasource<T> {
        let dc = new ListDatasource<T>(this.entityChangeNotifyService.subscribeAll, [], sub, datasourceFilterPredicate);

        return dc;
    }

    private createSingleDatasourceInternal(sub: Subscriber<T>, id: any): Datasource<T> {
        let dc = new SingleDatasource<T>(this.entityChangeNotifyService.subscribeAll, [], sub, e => e.getId() == id);

        return dc;
    }

    private createPageableDatasourceInternal(
        loadFunction: (dir: "forwards" | "backwards", skip: number, take: number) => Observable<T[]>,
        sortPredicate: (a: T, b: T) => number,
        filterPredicate?: (e: T) => boolean): PageableListDatasource<T> {

        let dc = new PageableListDatasource<T>(
            this.entityChangeNotifyService.subscribeAll,
            loadFunction,
            sortPredicate,
            filterPredicate
        );

        return dc;
    }

    public createDatasource(initialData: T[], datasourceFilterPredicate?: (entity: T) => boolean): Observable<T[]> {
        return new Observable<T[]>(s => {
            let ds = this.createListDatasourceInternal(s, datasourceFilterPredicate);
            ds.add(initialData);
        });
    }

    public getAll(): Observable<T[]> {
        return this.getAllAdvanced(null);
    }

    public getAllAdvanced(params: any, datasourceFilterPredicate?: (entity: T) => boolean): Observable<T[]> {
        return new Observable<T[]>(s => {
            let datasource = this.createListDatasourceInternal(s, datasourceFilterPredicate);

            this.httpClient.get<any[]>(`${appConfig.apiUrl}${this.controllerName}/getAll`, {
                params: params
            }).subscribe({
                next: (r: any[]) => datasource.add(r.map(o => new this.typeFactory(o))),
                error: (e: any) => s.error(e)
            });
        });
    }

    public getListAdvanced(params: any, sortPredicate: (a: T, b: T) => number, filter?: SmartFilter, filterPredicate?: (e: T) => boolean): PageableListDatasource<T> {
        let loadFunction = (dir: "forwards" | "backwards", skip: number, take: number): Observable<T[]> => {
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
            }).pipe(map(r => r.map(o => new this.typeFactory(o))));
        };

        let filterFunc = (e: T) => (filter == null || applySmartFilter(e, filter)) && (filterPredicate == null || filterPredicate(e));

        let datasource = this.createPageableDatasourceInternal(loadFunction, sortPredicate, filterFunc);
        datasource.load();

        return datasource;
    }

    public saveWithHeaders(entity: T, params?: any): Observable<{ model: T, headers: HttpHeaders }> {
        return this.httpClient.put<any>(`${appConfig.apiUrl}${this.controllerName}/edit/${entity.getId()}`, entity.getDTO(), {
            observe: "response",
            params: params
        }).pipe(
            map(r => {
                let newEntity = new this.typeFactory(r.body);

                this.entityChangeNotifyService.notifyUpdated(newEntity);

                return { model: newEntity, headers: r.headers };
            }),
            catchError(e => {
                if (e?.error?.errors)
                    entity.applyServerValidationErrors(e.error.errors);

                return throwError(() => e);
            }));
    }

    public save(entity: T, params?: any): Observable<T> {
        return this.saveWithHeaders(entity, params).pipe(map(r => r.model));
    }

    public addNewWithHeaders(entity: T, params?: any): Observable<{ model: T, headers: HttpHeaders }> {
        return this.httpClient.post<any>(`${appConfig.apiUrl}${this.controllerName}/addNew`, entity.getDTO(), {
            observe: "response",
            params: params
        }).pipe(
            map(r => {
                let newEntity = new this.typeFactory(r.body);

                this.entityChangeNotifyService.notifyAdded(newEntity);

                return { model: newEntity, headers: r.headers };
            }),
            catchError(e => {
                if (e?.error?.errors)
                    entity.applyServerValidationErrors(e.error.errors);

                return throwError(() => e);
            }));
    }

    public addNew(entity: T, params?: any): Observable<T> {
        return this.addNewWithHeaders(entity, params).pipe(map(r => r.model));
    }

    public delete(id: any): Observable<void> {
        return this.httpClient.delete<void>(`${appConfig.apiUrl}${this.controllerName}/delete/${id}`)
            .pipe(map(() => {
                this.entityChangeNotifyService.notifyDeleted(id);
            }));
    }

    public get(id: any): Observable<T> {
        return this.httpClient.get<any>(`${appConfig.apiUrl}${this.controllerName}/get/${id}`)
            .pipe(map(s => new this.typeFactory(s)));
    }

    public getWithDatasource(id: any): Observable<T | undefined> {
        return new Observable<T>(s => {
            let datasource = this.createSingleDatasourceInternal(s, id);

            this.httpClient.get<any>(`${appConfig.apiUrl}${this.controllerName}/get/${id}`, {
                context: new HttpContext().set(IGNORE_NOT_FOUND, true)
            })
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
}

export interface IDatasource<T extends Model<T>> {
    add(entities: T[]): void;
    update(entity: T): void;
    delete(id: any): void;
}

abstract class Datasource<T extends Model<T>> implements IDatasource<T> {
    data: T[];
    filterPredicate?: (entity: T) => boolean;
    isLoaded: boolean = false;

    constructor(
        entityChangeNotifySubject: (subs: EntityChangeNotifyPredicates<T>) => Subscription[],
        onUnsubscribe: Observable<void>,
        data: T[],
        filterPredicate?: (entity: T) => boolean
    ) {
        this.data = data;
        this.filterPredicate = filterPredicate;

        let subs = entityChangeNotifySubject({
            onAdded: e => this.add([e]),
            onDeleted: id => this.delete(id),
            onUpdated: e => this.update(e)
        });
        onUnsubscribe.pipe(take(1)).subscribe(() => {
            subs.forEach(s => s.unsubscribe());
        });
    }

    add(entities: T[]) {
        if (!this.isLoaded && entities.length == 0) {
            this.notifySubscriber();
            this.isLoaded = true;
            return;
        }

        this.isLoaded = true;

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
        if (!this.isLoaded)
            return;

        let oldEntity = this.data.find(o => isEqual(o.getId(), entity.getId()));

        if (oldEntity == null) {
            this.add([entity]);
            return;
        }

        updateEntity(oldEntity, entity);

        if (this.filterPredicate && !this.filterPredicate(oldEntity))
            this.data.splice(this.data.indexOf(oldEntity), 1);

        this.notifySubscriber();
    }

    delete(id: any) {
        if (!this.isLoaded)
            return;

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
}

class ListDatasource<T extends Model<T>> extends Datasource<T> {
    subscriber: Subscriber<T[]>;

    constructor(
        entityChangeNotifySubject: (subs: EntityChangeNotifyPredicates<T>) => Subscription[],
        data: T[],
        sub: Subscriber<T[]>,
        filterPredicate?: (entity: T) => boolean
    ) {
        super(entityChangeNotifySubject, onUnsubscribed(sub), data, filterPredicate);

        this.subscriber = sub;
    }

    notifySubscriber(): void {
        this.subscriber.next([...this.data]);
    }

    isUnsubscribed(): boolean {
        return this.subscriber.closed;
    }
}

class SingleDatasource<T extends Model<T>> extends Datasource<T> {
    subscriber: Subscriber<T>;

    constructor(
        entityChangeNotifySubject: (subs: EntityChangeNotifyPredicates<T>) => Subscription[],
        data: T[],
        sub: Subscriber<T>,
        filterPredicate?: (entity: T) => boolean
    ) {
        super(entityChangeNotifySubject, onUnsubscribed(sub), data, filterPredicate);

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

export class PageableListDatasource<T extends Model<T>> implements IDatasource<T> {
    private itemsPerPage = 20;

    private data: T[] = [];

    private reachedEndBackwards = false;
    private reachedEndForwards = false;

    private forwardsSkip = 0;
    private backwardsSkip = 0;

    private nextPageSub: Subscription | null = null;
    private previousPageSub: Subscription | null = null;

    private isFirstLoading: boolean = false;

    private subscribers: Subscriber<T[]>[] = [];
    private entityChangeNotifySubs?: Subscription[];

    constructor(
        private entityChangeNotifySubject: (subs: EntityChangeNotifyPredicates<T>) => Subscription[],
        private loadFunction: (dir: "forwards" | "backwards", skip: number, take: number) => Observable<T[]>,
        private sortPredicate: (a: T, b: T) => number,
        private filterPredicate?: (e: T) => boolean
    ) { }

    add(entities: T[], forceNotifySubscribers: boolean = false): void {
        if (!isSorted(entities, this.sortPredicate))
            throw new Error("Received entities are not correctly sorted. Check if backend sort matches frontends sort!");

        let changed = false;

        for (let newEntity of entities) {
            let oldEntity = this.data.find(o => isEqual(o.getId(), newEntity.getId()));
            if (oldEntity == null)
                changed = this.tryAddSingle(newEntity) || changed;
            else
                changed = this.tryUpdate(newEntity) || changed;
        }

        if (forceNotifySubscribers || changed)
            this.notifySubscribers();
    }

    private tryAddSingle(entity: T): boolean {
        if (this.filterPredicate && !this.filterPredicate(entity))
            return false;

        let addIndex = getInsertIndex(this.data, entity, this.sortPredicate);

        this.data.splice(addIndex, 0, entity);

        return true;
    }

    update(entity: T): void {
        if (this.tryUpdate(entity))
            this.notifySubscribers();
    }

    private tryUpdate(entity: T): boolean {
        let oldEntity = this.data.find(o => isEqual(o.getId(), entity.getId()));

        if (oldEntity == null)
            return this.tryAddSingle(entity);

        this.data.splice(this.data.indexOf(oldEntity), 1);

        updateEntity(oldEntity, entity);

        this.tryAddSingle(entity);

        return true;
    }

    delete(id: any): void {
        let index = this.data.findIndex(o => isEqual(o.getId(), id));

        if (index == -1)
            return;

        this.data.splice(index, 1);

        this.notifySubscribers();
    }

    notifySubscribers() {
        for (let s of this.subscribers) {
            if (!s.closed)
                s.next([...this.data]);
        }
    }

    notifyErrorSubscribers(error: any) {
        for (let s of this.subscribers) {
            if (!s.closed)
                s.error(error);
        }
    }

    load(): void {
        this.data = [];
        this.loadNextPage(true);
        this.isFirstLoading = true;
    }

    loadNextPage(forceNotifySubscribers: boolean = false): void {
        if (this.isFirstLoading)
            return;

        if (this.reachedEndForwards)
            return;

        if (this.nextPageSub != null)
            return;

        this.nextPageSub = this.loadFunction("forwards", this.forwardsSkip, this.itemsPerPage).subscribe({
            next: items => {
                this.isFirstLoading = false;

                this.forwardsSkip += items.length;
                if (items.length < this.itemsPerPage)
                    this.reachedEndForwards = true;

                this.nextPageSub = null;

                this.add(items, forceNotifySubscribers);
            },
            error: e => this.notifyErrorSubscribers(e)
        });

    }

    loadPreviousPage(): void {
        if (this.isFirstLoading)
            return;

        if (this.reachedEndBackwards)
            return;

        if (this.previousPageSub != null)
            return;

        this.previousPageSub = this.loadFunction("backwards", this.backwardsSkip, this.itemsPerPage).subscribe({
            next: items => {
                this.backwardsSkip += items.length;
                if (items.length < this.itemsPerPage)
                    this.reachedEndBackwards = true;

                this.previousPageSub = null;

                this.add(items.reverse());
            },
            error: e => this.notifyErrorSubscribers(e)
        });
    }

    isUnsubscribed(): boolean {
        return this.subscribers.length == 0 || this.subscribers.every(s => s.closed);
    }

    subscribe(observer: Partial<Observer<T[]>>): Subscription {
        return new Observable<T[]>(s => {
            this.subscribers.push(s);

            this.subscribeToEntityChangeNotify();
            this.listenForUnsubscribeAndUnsubscribeEntityChangeNotify(onUnsubscribed(s));

            if (!this.isFirstLoading)
                s.next([...this.data]);
        }).subscribe(observer);
    }

    dispose() {
        this.nextPageSub?.unsubscribe();
        this.previousPageSub?.unsubscribe();

        for (let s of this.subscribers) {
            s.unsubscribe();
        }

        if (this.entityChangeNotifySubs != undefined) {
            throw "We have a leak on entityChangeNotifySubs!";
        }
    }

    isLoadingNext() {
        return this.nextPageSub != null;
    }

    isLoadingPrevious() {
        return this.previousPageSub != null;
    }

    isReachedEndBackwards(): boolean {
        return this.reachedEndBackwards;
    }

    isReachedEndForwards(): boolean {
        return this.reachedEndForwards;
    }

    private subscribeToEntityChangeNotify() {
        if (this.entityChangeNotifySubs == null) {
            this.entityChangeNotifySubs = this.entityChangeNotifySubject({
                onAdded: e => this.add([e]),
                onDeleted: id => this.delete(id),
                onUpdated: e => this.update(e)
            });
        }
    }

    private listenForUnsubscribeAndUnsubscribeEntityChangeNotify(onUnsubscribe: Observable<void>) {
        onUnsubscribe.pipe(take(1)).subscribe(() => {
            if (this.subscribers.length == 0 || this.subscribers.every(s => s.closed)) {
                this.entityChangeNotifySubs?.forEach(s => s.unsubscribe());
                this.entityChangeNotifySubs = undefined;
            }
        });
    }
}

function updateEntity<T extends Model<T>>(oldEntity: T, newEntity: T) {
    let newSymbols = Object.getOwnPropertySymbols(newEntity);
    let oldSymbols = Object.getOwnPropertySymbols(oldEntity);

    for (let newSymbol of newSymbols) {
        for (let oldSymbol of oldSymbols) {
            if (newSymbol.description == null)
                continue;

            if (newSymbol.description.startsWith("#S"))
                continue;

            if (newSymbol.description == oldSymbol.description) {
                (oldEntity as any)[oldSymbol] = (newEntity as any)[newSymbol];
            }
        }
    }
}