import dayjs from "dayjs";
import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";
import "dayjs/plugin/objectSupport";
import "dayjs/plugin/isSameOrBefore";
import "dayjs/plugin/isSameOrAfter";

export function timeOnly(dateTime: Dayjs) {
    return dayjs({
        hour: dateTime.hour(),
        minute: dateTime.minute(),
        second: dateTime.second(),
        millisecond: dateTime.millisecond()
    });
}

export function parseDuration(duration: string): Duration {
    let time = dayjs(duration, "HH:mm:ss");

    return dayjs.duration({
        hours: time.hour(),
        minutes: time.minute(),
        seconds: time.second(),
        milliseconds: time.millisecond()
    });
}

export function overlap(startA: Dayjs, endA: Dayjs, startB: Dayjs, endB: Dayjs, d: '()' | '[]' | '[)' | '(]' = "()") {
    if (startA.isAfter(endA) || startB.isAfter(endB))
        throw new Error("Start cannot be after end!");

    let left: boolean = false;
    let right: boolean = false;

    if (d[0] == '(')
        left = startA.isBefore(endB);
    else
        left = startA.isSameOrBefore(endB);

    if (d[1] == ')')
        right = endA.isAfter(startB);
    else
        right = endA.isSameOrAfter(startB);

    return left && right;
}

/**
 * Signed time, in milliseconds, between the end of the earlier appointment
 * (prevStart + prevDuration) and the start of the later one (nextStart):
 *   > 0  → a gap (idle time between them)
 *   = 0  → back-to-back
 *   < 0  → they overlap; the magnitude is how long they overlap.
 */
export function timeBetweenMs(prevStart: Dayjs, prevDuration: Duration, nextStart: Dayjs): number {
    return nextStart.diff(prevStart.add(prevDuration.asMilliseconds(), "millisecond"));
}