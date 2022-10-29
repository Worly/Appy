export function isSorted<T>(arr: T[], predicate: (a: T, b: T) => number): boolean {
    for (let i = 0; i < arr.length - 1; i++) {
        if (predicate(arr[i], arr[i + 1]) > 0)
            return false;
    }

    return true;
}

export function getInsertIndex<T>(arr: T[], newItem: T, sortPredicate: (a: T, b: T) => number): number {
    if (!isSorted(arr, sortPredicate))
        throw new Error("Array must be sorted to find insert index");

    for (let i = 0; i < arr.length; i++) {
        if (isBefore(newItem, arr[i], sortPredicate))
            return i;
    }

    return arr.length;
}

export function isBefore<T>(e: T, before: T, sortPredicate: (a: T, b: T) => number): boolean {
    return sortPredicate(e, before) < 0;
}

export function isAfter<T>(e: T, after: T, sortPredicate: (a: T, b: T) => number): boolean {
    return sortPredicate(e, after) > 0;
}