import { Pipe, PipeTransform } from '@angular/core';
import { duration } from 'dayjs';
import { Duration, DurationUnitType } from "dayjs/plugin/duration";

@Pipe({ name: 'toDuration' })
export class ToDurationPipe implements PipeTransform {
    constructor() { }

    transform(ms: number, unit: DurationUnitType): Duration {
        return duration(ms, unit);
    }
}