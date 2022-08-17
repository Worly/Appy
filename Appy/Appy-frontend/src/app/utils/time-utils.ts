import dayjs from "dayjs";
import { Dayjs } from "dayjs";
import { Duration } from "dayjs/plugin/duration";

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