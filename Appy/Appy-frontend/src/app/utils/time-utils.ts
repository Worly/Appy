import moment, { Moment } from "moment";

export function timeOnly(dateTime: Moment) {
    return moment({
        hours: dateTime.hours(),
        minutes: dateTime.minutes(),
        seconds: dateTime.seconds(),
        milliseconds: dateTime.milliseconds()
    });
}