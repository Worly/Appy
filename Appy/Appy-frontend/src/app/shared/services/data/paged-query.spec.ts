import { Subject, of, throwError } from "rxjs";
import { pagedQuery } from "./paged-query";
import { PageDirection } from "./contracts";

const asc = (a: number, b: number) => a - b;

/** Builds a loadPage that slices fixed forwards/backwards datasets by skip/take. */
function dataset(forwards: number[], backwards: number[] = []) {
    return (dir: PageDirection, skip: number, take: number) =>
        of((dir === "forwards" ? forwards : backwards).slice(skip, skip + take));
}

function lastEmission<T>(emissions: T[][]): T[] {
    return emissions[emissions.length - 1];
}

describe("pagedQuery()", () => {
    it("loads the first forwards page on creation and emits it sorted", () => {
        const pq = pagedQuery<number>({ loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2 });

        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));

        expect(lastEmission(emissions)).toEqual([10, 11]);
    });

    it("appends the next page on loadMore('forwards')", () => {
        const pq = pagedQuery<number>({ loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2 });

        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));

        pq.loadMore("forwards");

        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]);
    });

    it("prepends earlier items on loadMore('backwards'), keeping the buffer globally sorted", () => {
        // backend returns backwards pages descending (nearest-to-anchor first)
        const pq = pagedQuery<number>({ loadPage: dataset([10, 11], [9, 8, 7, 6]), sort: asc, pageSize: 2 });

        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));

        pq.loadMore("backwards");
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]);

        pq.loadMore("backwards");
        expect(lastEmission(emissions)).toEqual([6, 7, 8, 9, 10, 11]);
    });

    it("reports hasMore false once a partial page is returned", () => {
        const pq = pagedQuery<number>({ loadPage: dataset([10, 11, 12]), sort: asc, pageSize: 2 });

        pq.items$.subscribe();
        expect(pq.hasMore("forwards")).toBe(true);

        pq.loadMore("forwards"); // returns [12] — a partial page
        expect(pq.hasMore("forwards")).toBe(false);
    });

    it("drops filtered items from the buffer but still advances the backend skip", () => {
        const pq = pagedQuery<number>({
            loadPage: dataset([10, 11, 12, 13]),
            sort: asc,
            pageSize: 2,
            filter: n => n % 2 === 0
        });

        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));

        expect(lastEmission(emissions)).toEqual([10]); // 11 filtered out of page [10,11]

        pq.loadMore("forwards"); // page [12,13] — skip advanced past 11, not re-fetched
        expect(lastEmission(emissions)).toEqual([10, 12]);
    });

    it("reports loading true while a page is in flight and false once it resolves", () => {
        const source = new Subject<number[]>();
        const pq = pagedQuery<number>({ loadPage: () => source, sort: asc, pageSize: 2 });

        const loadings: boolean[] = [];
        pq.loading$.subscribe(l => loadings.push(l));

        expect(loadings[loadings.length - 1]).toBe(true);

        source.next([1, 2]);
        expect(loadings[loadings.length - 1]).toBe(false);
    });

    it("resets and reloads from the anchor on refetch()", () => {
        const pq = pagedQuery<number>({ loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2 });

        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));

        pq.loadMore("forwards");
        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]);

        pq.refetch();
        expect(lastEmission(emissions)).toEqual([10, 11]);
        expect(pq.hasMore("forwards")).toBe(true);
    });

    it("emits the error on error$ when a page fails", () => {
        const pq = pagedQuery<number>({ loadPage: () => throwError(() => new Error("nope")), sort: asc });

        const errors: unknown[] = [];
        pq.error$.subscribe(e => errors.push(e));

        expect((errors[errors.length - 1] as Error)?.message).toBe("nope");
    });

    it("surfaces an error when a page is not sorted per the sort predicate", () => {
        const pq = pagedQuery<number>({ loadPage: dataset([2, 1]), sort: asc, pageSize: 2 });

        const errors: unknown[] = [];
        pq.error$.subscribe(e => errors.push(e));

        expect(errors[errors.length - 1]).toBeTruthy();
    });
});
