import dayjs, { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";

export interface RenderedInterval<T> {
    top: number;
    height: number;
    color?: string;
    time: string;
    source: T;
}

export function getRenderedInterval<T>(timeFrom: Dayjs, timeTo: Dayjs, source: T, time: Dayjs, duration: Duration, color?: string): RenderedInterval<T> | null {
    let ri: RenderedInterval<T> = {
        top: (time.diff(timeFrom) / timeTo.diff(timeFrom)) * 100,
        height: (duration.asMilliseconds() / timeTo.diff(timeFrom)) * 100,
        color: color,
        time: `${time.format("HH:mm")} - ${time.add(duration).format("HH:mm")}`,
        source: source
    };

    console.log(dayjs().add(dayjs.duration({ minutes: 30 })));

    return ri;
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