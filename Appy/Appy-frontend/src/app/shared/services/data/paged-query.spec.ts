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

    it("reports loadingForwards$ for the in-flight forwards page only", () => {
        const sources: Subject<number[]>[] = [new Subject(), new Subject()];
        let call = 0;
        const pq = pagedQuery<number>({ loadPage: () => sources[call++], sort: asc, pageSize: 2 });

        let fwd = false, bwd = false;
        pq.loadingForwards$.subscribe(l => fwd = l);
        pq.loadingBackwards$.subscribe(l => bwd = l);

        // First (auto) load is forwards.
        expect(fwd).toBe(true);
        expect(bwd).toBe(false);

        sources[0].next([1, 2]); // resolve the forwards page
        expect(fwd).toBe(false);
        expect(bwd).toBe(false);
    });

    it("reports loadingBackwards$ for the in-flight backwards page only", () => {
        const fwdSource = new Subject<number[]>();
        const bwdSource = new Subject<number[]>();
        const pq = pagedQuery<number>({
            loadPage: dir => dir === "forwards" ? fwdSource : bwdSource,
            sort: asc,
            pageSize: 2
        });

        let fwd = false, bwd = false;
        pq.loadingForwards$.subscribe(l => fwd = l);
        pq.loadingBackwards$.subscribe(l => bwd = l);

        fwdSource.next([10, 11]); // finish the initial forwards load so loadMore is honoured
        expect(fwd).toBe(false);

        pq.loadMore("backwards");
        expect(bwd).toBe(true);
        expect(fwd).toBe(false);

        bwdSource.next([9, 8]);
        expect(bwd).toBe(false);
    });

    it("keeps loading$ true while either direction is loading", () => {
        const fwdSource = new Subject<number[]>();
        const bwdSource = new Subject<number[]>();
        const pq = pagedQuery<number>({
            loadPage: dir => dir === "forwards" ? fwdSource : bwdSource,
            sort: asc,
            pageSize: 2
        });

        let loading = false;
        pq.loading$.subscribe(l => loading = l);

        fwdSource.next([10, 11]); // initial forwards done
        expect(loading).toBe(false);

        pq.loadMore("backwards");
        expect(loading).toBe(true); // backwards now loading

        bwdSource.next([9, 8]);
        expect(loading).toBe(false);
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
