import { Injectable } from "@angular/core";
import { Subject, Subscription } from "rxjs";
import { EditModel, BaseModel } from "src/app/models/base-model";

@Injectable({ providedIn: "root" })
export class EntityChangeNotifyService {
    private subjects: { [entityType: string]: EntitySubjects } = {}

    subscribeAdded<T extends BaseModel>(entityType: string, pred: (entity: T) => void): Subscription {
        var subjects = this.getOrCreateSubjects(entityType);

        return subjects.added.subscribe({
            next: e => {
                pred(e);
            }
        })
    }

    subscribeDeleted<T extends BaseModel>(entityType: string, pred: (id: any) => void): Subscription {
        var subjects = this.getOrCreateSubjects(entityType);

        return subjects.deleted.subscribe({
            next: id => {
                pred(id);
            }
        })
    }

    subscribeUpdated<T extends BaseModel>(entityType: string, pred: (entity: T) => void): Subscription {
        var subjects = this.getOrCreateSubjects(entityType);

        return subjects.updated.subscribe({
            next: e => {
                pred(e);
            }
        })
    }

    subscribeAll<T extends BaseModel>(entityType: string, preds: EntityChangeNotifyPredicates<T>): Subscription[] {
        return [
            this.subscribeAdded(entityType, preds.onAdded), 
            this.subscribeDeleted(entityType, preds.onDeleted), 
            this.subscribeUpdated(entityType, preds.onUpdated)
        ];
    }

    notifyAdded<T extends BaseModel>(entityType: string, entity: T) {
        var subjects = this.subjects[entityType];
        if (subjects == null)
            return;

        subjects.added.next(entity);
    }

    notifyDeleted(entityType: string, id: any) {
        var subjects = this.subjects[entityType];
        if (subjects == null)
            return;

        subjects.deleted.next(id);
    }

    notifyUpdated<T extends BaseModel>(entityType: string, entity: T) {
        var subjects = this.subjects[entityType];
        if (subjects == null)
            return;

        subjects.updated.next(entity);
    }

    for<T extends BaseModel>(entityType: string): EntityChangeNotifyFns<T> {
        return {
            subscribeAdded: pred => this.subscribeAdded(entityType, pred),
            subscribeDeleted: pred => this.subscribeDeleted(entityType, pred),
            subscribeUpdated: pred => this.subscribeUpdated(entityType, pred),
            subscribeAll: preds => this.subscribeAll(entityType, preds),
            notifyAdded: e => this.notifyAdded(entityType, e),
            notifyDeleted: id => this.notifyDeleted(entityType, id),
            notifyUpdated: e => this.notifyUpdated(entityType, e)
        }
    }

    private getOrCreateSubjects(entityType: string): EntitySubjects {
        if (this.subjects[entityType] == null) {
            this.subjects[entityType] = new EntitySubjects();
        }

        return this.subjects[entityType];
    }
}

class EntitySubjects {
    added: Subject<any> = new Subject<any>();
    deleted: Subject<any> = new Subject<any>();
    updated: Subject<any> = new Subject<any>();
}

export type EntityChangeNotifyPredicates<T extends BaseModel> = {
    onAdded: (entity: T) => void,
    onDeleted: (id: any) => void,
    onUpdated: (entity: T) => void
}

export type EntityChangeNotifyFns<T extends BaseModel> = {
    subscribeAdded: (pred: (entity: T) => void) => Subscription;
    subscribeDeleted: (pred: (id: any) => void) => Subscription;
    subscribeUpdated: (pred: (entity: T) => void) => Subscription;
    subscribeAll: (pred: EntityChangeNotifyPredicates<T>) => Subscription[];

    notifyAdded: (entity: T) => void;
    notifyDeleted: (id: any) => void;
    notifyUpdated: (entity: T) => void;
}