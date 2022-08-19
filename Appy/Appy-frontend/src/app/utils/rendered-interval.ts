import dayjs, { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";

export interface RenderedInterval<T> {
    top: number;
    left: number;
    height: number;
    width: number;
    color?: string;
    time: string;
    source: T;
}

export function getRenderedInterval<T>(timeFrom: Dayjs, timeTo: Dayjs, source: T, time: Dayjs, duration: Duration, color?: string): RenderedInterval<T> {
    let ri: RenderedInterval<T> = {
        top: getIntervalTop(timeFrom, timeTo, time),
        left: 0,
        height: getIntervalHeight(timeFrom, timeTo, duration),
        width: 100,
        color: color,
        time: `${time.format("HH:mm")} - ${time.add(duration).format("HH:mm")}`,
        source: source
    };

    return ri;
}

export function getIntervalTop(timeFrom: Dayjs, timeTo: Dayjs, time: Dayjs): number {
    return (time.diff(timeFrom) / timeTo.diff(timeFrom)) * 100;
}

export function getIntervalHeight(timeFrom: Dayjs, timeTo: Dayjs, duration: Duration): number { 
    return (duration.asMilliseconds() / timeTo.diff(timeFrom)) * 100
}

export function cropRenderedInterval<T>(ri: RenderedInterval<T> | null, removeTopOverflow: boolean = false): RenderedInterval<T> | null {
    if (ri == null)
        return null;

    if (removeTopOverflow && ri.top < 0 || ri.top >= 100)
        return null;

    if (ri.top < 0) {
        ri.height += ri.top;
        ri.top = 0;
    }

    if (ri.top + ri.height > 100)
        ri.height = 100 - ri.top;

    if (ri.height <= 0)
        return null;

    return ri;
}

export function layoutRenderedIntervals<T>(intervals: RenderedInterval<T>[]) {
    let groups: RenderedInterval<T>[][] = [];

    let currentGroup: RenderedInterval<T>[] = [];
    let currentGroupBottom: number | undefined;

    intervals.sort((a, b) => {
        let aBottom = a.top + a.height;
        let bBottom = b.top + b.height;
        let c = compareFloats(a.top, b.top);
        if (c == 0)
            return compareFloats(a.top + a.height, b.top + b.height);
        else
            return c;
    });

    for (let ri of intervals) {
        if (currentGroupBottom != null && compareFloats(ri.top, currentGroupBottom) >= 0) {
            groups.push(currentGroup);

            currentGroup = [];
            currentGroupBottom = undefined;
        }

        currentGroup.push(ri);
        if (currentGroupBottom == null || compareFloats(ri.top + ri.height, currentGroupBottom) > 0)
            currentGroupBottom = ri.top + ri.height;
    }

    groups.push(currentGroup);

    groups.forEach(g => packGroup(g));
}

function packGroup<T>(group: RenderedInterval<T>[]) {
    let columns: {
        ris: RenderedInterval<T>[],
        bottom: number
    }[] = [];


    for (let ri of group) {
        let found = false;
        for (let col of columns) {
            if (compareFloats(ri.top, col.bottom) >= 0) {
                col.ris.push(ri);
                col.bottom = ri.top + ri.height;
                found = true;
                break;
            }
        }

        if (!found) {
            columns.push({
                ris: [ri],
                bottom: ri.top + ri.height
            });
        }

        columns.sort((a, b) => {
            let aSum = a.ris.map(r => r.height).reduce((a, b) => a + b);
            let bSum = b.ris.map(r => r.height).reduce((a, b) => a + b);

            return bSum - aSum;
        });
    }

    let columnWidth = 100 / columns.length;
    for (let i = 0; i < columns.length; i++) {
        for (let ri of columns[i].ris) {
            ri.left = i * columnWidth;
            ri.width = columnWidth;
        }
    }

    for (let i = 0; i < columns.length; i++)
        expandColumn(columns[i].ris, columnWidth, columns.slice(i + 1).map(c => c.ris));
}

function expandColumn<T>(ris: RenderedInterval<T>[], columnWidth: number, rightRis: RenderedInterval<T>[][]) {
    if (rightRis.length == 0)
        return;

    for (let ri of ris) {
        let done = false;
        for (let c = 0; c < rightRis.length; c++) {
            let column = rightRis[c];

            if (column.some(r => overlap(ri, r))) {
                ri.width = (c + 1) * columnWidth;
                done = true;
                break;
            }
        }

        if (!done)
            ri.width = (rightRis.length + 1) * columnWidth;
    }
}

function overlap<T>(a: RenderedInterval<T>, b: RenderedInterval<T>): boolean {
    return compareFloats(a.top, b.top + b.height) < 0 && compareFloats(a.top + a.height, b.top) > 0;
}

function compareFloats(a: number, b: number): number {
    let diff = a - b;
    let epsilon = 0.01;

    if (diff > epsilon)
        return 1;
    if (diff < -epsilon)
        return -1;
    else
        return 0;
}