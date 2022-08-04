import { Observable, Subject, Subscription } from "rxjs";
import { Moment } from "moment";

export class SmartCaching<keyT, valueT> {

    private _data: Data<keyT, valueT>[] = [];
    private keyTransformFunction: (key: keyT, add: number) => keyT;
    private keyCompareFunction: (left: keyT, right: keyT) => number;
    private loadFunction: (key: keyT) => Observable<valueT>;
    public showCount: number;
    private cacheCount: number;

    private loadedKey: keyT | null = null;

    public onDataLoaded: Subject<Data<keyT, valueT>> = new Subject();

    constructor(
        keyTransform: (key: keyT, add: number) => keyT,
        keyCompare: (left: keyT, right: keyT) => number,
        load: (key: keyT) => Observable<valueT>,
        showCount: number = 1,
        cacheCount: number = 2,
    ) {
        this.keyTransformFunction = keyTransform;
        this.keyCompareFunction = keyCompare;
        this.loadFunction = load;
        this.showCount = showCount;
        this.cacheCount = cacheCount;
    }

    public get data(): Data<keyT, valueT>[] {
        return this._data;
    }

    public get singleData(): valueT | null {
        if (this.loadedKey == null)
            return null;

        let d = this._data.find(d => this.keyCompareFunction(d.key, this.loadedKey as keyT) == 0);
        if (d == null)
            return null;

        return d.data;
    }

    public load(key: keyT) {
        let newData: Data<keyT, valueT>[] = [];

        let firstVisibleKey = this.keyTransformFunction(key, 0);
        let lastVisibleKey = this.keyTransformFunction(key, this.showCount - 1);

        let beginKey = this.keyTransformFunction(firstVisibleKey, -this.cacheCount);
        let endKey = this.keyTransformFunction(lastVisibleKey, this.cacheCount);

        let current = this.keyTransformFunction(beginKey, 0);

        while (this.keyCompareFunction(current, endKey) <= 0) {
            let data = this._data.find(d => this.keyCompareFunction(d.key, current) == 0);

            if (data == null) {
                data = {
                    key: this.keyTransformFunction(current, 0),
                    data: null,
                } as Data<keyT, valueT>;

                data.subscription = this.loadFunction(data.key)
                    .subscribe(c => {
                        if (data != null) {
                            data.data = c;
                            this.onDataLoaded.next(data);
                        }
                    });
            }

            data.show = this.keyCompareFunction(current, firstVisibleKey) >= 0 && this.keyCompareFunction(current, lastVisibleKey) <= 0;

            newData.push(data);

            current = this.keyTransformFunction(current, 1);
        }

        // unsubscribe old data
        for (let oldData of this._data) {
            if (newData.findIndex(d => this.keyCompareFunction(d.key, oldData.key) == 0) == -1)
                oldData.subscription?.unsubscribe();
        }

        this._data = newData;
        this.loadedKey = key;
    }

    public dispose() {
        for (let d of this._data) {
            d.subscription?.unsubscribe();
        }

        this.onDataLoaded.unsubscribe();
    }
}

export class DateSmartCaching<valueT> extends SmartCaching<Moment, valueT> {
    constructor(
        load: (key: Moment) => Observable<valueT>,
        showCount: number = 1,
        cacheCount: number = 2) {
        super(
            (date: Moment, add: number) => date.clone().add({ days: add }),
            (left: Moment, right: Moment) => {
                if (left.isBefore(right, "date"))
                    return -1;
                else if (left.isSame(right, "date"))
                    return 0;
                else
                    return 1;
            },
            load,
            showCount,
            cacheCount);
    }
}

export type Data<keyT, valueT> = {
    key: keyT;
    data: valueT | null;
    show: boolean;
    subscription: Subscription;
};