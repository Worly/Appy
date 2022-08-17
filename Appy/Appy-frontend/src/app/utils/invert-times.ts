import { Dayjs } from "dayjs";
import { timeOnly } from "./time-utils";

export interface TimeInterval {
    from: Dayjs;
    to: Dayjs;
}

export function invertTimes(times: TimeInterval[], timeStart: Dayjs, timeEnd: Dayjs): TimeInterval[] {
    return invertTimesCustom<TimeInterval>(times, t => t.from, t => t.to, timeStart, timeEnd);
}

export function invertTimesCustom<T>(timesT: T[], fromSelector: ((t: T) => Dayjs), toSelector: ((t: T) => Dayjs), timeStart: Dayjs, timeEnd: Dayjs): TimeInterval[] {
    timeStart = timeOnly(timeStart);
    timeEnd = timeOnly(timeEnd);

    // duplicate times array and map DateTime to time only to be sure we are dealing with time only
    let times = timesT.map(t => {
        let from = fromSelector(t);
        let to = toSelector(t);
        return {
            from: timeOnly(from),
            to: timeOnly(to)
        };
    });

    // sort them by from time
    times.sort((a, b) => a.from.diff(b.to))

    // check if any of them is overlapping
    for (let i = 0; i < times.length - 1; i++) {
        if (times[i].to.isAfter(times[i + 1].from))
            throw new Error("Times overlap!");
    }

    let invertedTimes: TimeInterval[] = [];

    if (times.length == 0)
        return [{ from: timeStart, to: timeEnd }];

    if (times[0].from.isAfter(timeStart)) {
        invertedTimes.push({
            from: timeStart,
            to: times[0].from
        });
    }

    let currentFromTime = times[0].to;
    for (let i = 1; i < times.length; i++) {
        if (currentFromTime.isSame(times[i].from))
            continue;

        invertedTimes.push({
            from: currentFromTime,
            to: times[i].from
        });

        currentFromTime = times[i].to;
    }

    if (currentFromTime.isBefore(timeEnd)) {
        invertedTimes.push({
            from: currentFromTime,
            to: timeEnd
        });
    }

    return invertedTimes;
}