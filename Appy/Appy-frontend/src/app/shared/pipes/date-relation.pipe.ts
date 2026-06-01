import { Pipe, PipeTransform } from '@angular/core';
import { Dayjs } from 'dayjs';
import { getDateRelation } from './relative-date.pipe';

// Impure: depends on the current day, not just the input.
@Pipe({ name: 'dateRelation', pure: false })
export class DateRelationPipe implements PipeTransform {
    transform(date: Dayjs | null | undefined): 'today' | 'future' | 'past' | null {
        if (date == null || !date.isValid())
            return null;
        return getDateRelation(date);
    }
}
