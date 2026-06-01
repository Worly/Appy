import { Pipe, PipeTransform } from '@angular/core';
import dayjs, { Dayjs } from 'dayjs';
import { TranslateService } from 'src/app/components/translate/translate.service';

/** Signed whole-day difference between `date` and `now`, both truncated to start-of-day. */
export function dateDayDiff(date: Dayjs, now: Dayjs = dayjs()): number {
    return date.startOf('day').diff(now.startOf('day'), 'day');
}

/** Where `date` sits relative to `now`, by calendar day. */
export function getDateRelation(date: Dayjs, now: Dayjs = dayjs()): 'today' | 'future' | 'past' {
    const diff = dateDayDiff(date, now);
    if (diff === 0) return 'today';
    return diff > 0 ? 'future' : 'past';
}

// Impure (like TranslatePipe): the result depends on the current day and the active locale,
// neither of which is an input argument.
@Pipe({ name: 'relativeDate', pure: false })
export class RelativeDatePipe implements PipeTransform {
    constructor(private translateService: TranslateService) { }

    transform(date: Dayjs | null | undefined): string | null {
        if (date == null || !date.isValid())
            return null;

        const diff = dateDayDiff(date);

        if (diff === 0) return this.translateService.translate('relativeDate.TODAY');
        if (diff === 1) return this.translateService.translate('relativeDate.TOMORROW');
        if (diff === -1) return this.translateService.translate('relativeDate.YESTERDAY');

        // diff is always >= 2 or <= -2 here (|1| handled above), so the count is always plural.
        const n = Math.abs(diff);
        const key = diff > 0 ? 'relativeDate.IN_DAYS' : 'relativeDate.DAYS_AGO';
        return this.translateService.translate(key).replace('{n}', n.toString());
    }
}
