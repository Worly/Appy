import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'filter' })
export class FilterPipe implements PipeTransform {
    transform(value: Array<any>, predicate: (arg: any) => boolean): any {
        return value.filter(predicate);
    }
}