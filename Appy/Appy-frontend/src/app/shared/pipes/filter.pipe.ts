import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filter' })
export class FilterPipe implements PipeTransform {
    transform<T>(value: T[] | null | undefined, predicate: (arg: any) => boolean, thisBind?: any, ...bindArgs: any[]): T[] | null {
        if (value == null)
            return null;

        return value.filter(predicate.bind(thisBind, ...bindArgs));
    }
}