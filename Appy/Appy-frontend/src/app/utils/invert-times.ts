import moment, { Moment } from "moment";

export interface TimeInterval {
    from: Moment;
    to: Moment;
}

export function invertTimes(times: TimeInterval[], timeStart: Moment, timeEnd: Moment): TimeInterval[] {
    return invertTimesCustom<TimeInterval>(times, t => t.from, t => t.to, timeStart, timeEnd);
}

export function invertTimesCustom<T>(timesT: T[], fromSelector: ((t: T) => Moment), toSelector: ((t: T) => Moment), timeStart: Moment, timeEnd: Moment): TimeInterval[] {
    timeStart = moment({
        hours: timeStart.hours(),
        minute: timeStart.minutes(),
        seconds: timeStart.seconds()
    });

    timeEnd = moment({
        hours: timeEnd.hours(),
        minute: timeEnd.minutes(),
        seconds: timeEnd.seconds()
    });

    // duplicate times array and map DateTime to time only to be sure we are dealing with time only
    let times = timesT.map(t => {
        let from = fromSelector(t);
        let to = toSelector(t);
        return {
            from: moment({
                hours: from.hours(),
                minute: from.minutes(),
                seconds: from.seconds()
            }),
            to: moment({
                hours: to.hours(),
                minute: to.minutes(),
                seconds: to.seconds()
            })
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