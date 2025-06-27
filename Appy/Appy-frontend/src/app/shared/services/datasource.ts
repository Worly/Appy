import { EntityChangeNotifyPredicates } from "./entity-change-notify.service";
import { Observable, Observer, Subscriber, Subscription, take } from "rxjs";
import { isEqual } from "lodash-es";
import { onUnsubscribed } from "src/app/utils/smart-subscriber";
import { getInsertIndex, isSorted } from "src/app/utils/array-utils";
import { BaseModel, IPropertyUpdateable } from "src/app/models/base-model";

export interface IDatasource<T extends BaseModel> {
    add(entities: T[]): void;
    update(entity: T): void;
    delete(id: any): void;
}

export abstract class Datasource<T extends BaseModel> implements IDatasource<T> {
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

export class ListDatasource<T extends BaseModel> extends Datasource<T> {
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

export class SingleDatasource<T extends BaseModel> extends Datasource<T> {
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

export class PageableListDatasource<T extends BaseModel> implements IDatasource<T> {
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

function updateEntity<T extends IPropertyUpdateable>(oldEntity: T, newEntity: T) {
    let newProperties = newEntity.getPropertyNames();
    let oldProperties = oldEntity.getPropertyNames();

    for (let newProperty of newProperties) {
        for (let oldProperty of oldProperties) {
            if (newProperty == oldProperty) {
                let value = newEntity.getPropertyValue(newProperty);
                oldEntity.setPropertyValue(oldProperty, value);
            }
        }
    }
}