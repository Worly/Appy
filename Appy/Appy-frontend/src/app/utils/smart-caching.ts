import { Dayjs } from "dayjs";
import { Observable, Subject, Subscription } from "rxjs";

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
        cacheCount: number = 1,
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

        this.callLoad();
    }

    private callLoad() {
        // first call load on all showing data, and when they are complete call it on all others
        let shownNotLoaded = this._data.filter(d => d.show && !d.hasData);
        if (shownNotLoaded.length > 0)
            this.loadInternal(shownNotLoaded);
        else
            this.loadInternal(this._data);
    }

    private loadInternal(list: Data<keyT, valueT>[]) {
        for (let data of list) {
            if (data.subscription == null) {
                data.subscription = this.loadFunction(data.key)
                    .subscribe(c => {
                        if (data != null) {
                            data.data = c;
                            data.hasData = true;
                            this.onDataLoadedInternal(data);
                        }
                    });
            }
        }
    }

    private onDataLoadedInternal(data: Data<keyT, valueT>) {
        this.onDataLoaded.next(data);
        this.callLoad();
    }

    public dispose() {
        for (let d of this._data) {
            d.subscription?.unsubscribe();
        }

        this.onDataLoaded.unsubscribe();
    }
}

export class DateSmartCaching<valueT> extends SmartCaching<Dayjs, valueT> {
    constructor(
        load: (key: Dayjs) => Observable<valueT>,
        showCount: number = 1,
        cacheCount: number = 1) {
        super(
            (date: Dayjs, add: number) => date.add(add, "days"),
            (left: Dayjs, right: Dayjs) => {
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
    hasData: boolean;
    show: boolean;
    subscription: Subscription;
};