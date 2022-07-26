export function groupBy<T>(array: T[], key: string): { [Key: string]: T[] } {
    return array.reduce((rv, x) => {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
}