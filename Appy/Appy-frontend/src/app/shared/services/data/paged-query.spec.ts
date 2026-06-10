import { QueryClient } from "@tanstack/query-core";
import { Subject, of, throwError } from "rxjs";
import { pagedQuery } from "./paged-query";
import { PageDirection } from "./contracts";

const flush = () => new Promise<void>(resolve => setTimeout(resolve));
const asc = (a: number, b: number) => a - b;
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Builds a loadPage that slices fixed forwards/backwards datasets by skip/take. */
function dataset(forwards: number[], backwards: number[] = []) {
    return (dir: PageDirection, skip: number, take: number) =>
        of((dir === "forwards" ? forwards : backwards).slice(skip, skip + take));
}

function lastEmission<T>(emissions: T[][]): T[] {
    return emissions[emissions.length - 1];
}

describe("pagedQuery()", () => {
    it("loads the first forwards page on subscription and emits it sorted", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 1], loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2 });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11]);
    });

    it("appends the next page on loadMore('forwards')", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 2], loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2 });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        pq.loadMore("forwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]);
    });

    it("prepends earlier items on loadMore('backwards'), keeping the buffer globally sorted", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 3], loadPage: dataset([10, 11], [9, 8, 7, 6]), sort: asc, pageSize: 2 });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]);
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([6, 7, 8, 9, 10, 11]);
    });

    it("reports hasMore false once a partial page is returned", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 4], loadPage: dataset([10, 11, 12]), sort: asc, pageSize: 2 });
        pq.items$.subscribe();
        await flush();
        expect(pq.hasMore("forwards")).toBe(true);
        pq.loadMore("forwards");
        await flush();
        expect(pq.hasMore("forwards")).toBe(false);
    });

    it("drops filtered items from the buffer but still advances the backend skip", async () => {
        const pq = pagedQuery<number>(newClient(), {
            queryKey: ["p", 5], loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2, filter: n => n % 2 === 0,
        });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        expect(lastEmission(emissions)).toEqual([10]);
        pq.loadMore("forwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 12]);
    });

    it("reports loading true while a page is in flight and false once it resolves", async () => {
        const source = new Subject<number[]>();
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 6], loadPage: () => source, sort: asc, pageSize: 2 });
        const loadings: boolean[] = [];
        pq.loading$.subscribe(l => loadings.push(l));
        pq.items$.subscribe();
        await flush();
        expect(loadings[loadings.length - 1]).toBe(true);
        source.next([1, 2]);
        source.complete();
        await flush();
        expect(loadings[loadings.length - 1]).toBe(false);
    });

    it("reports loadingForwards$ for the initial forwards page", async () => {
        const source = new Subject<number[]>();
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 7], loadPage: () => source, sort: asc, pageSize: 2 });
        let fwd = false, bwd = false;
        pq.loadingForwards$.subscribe(l => fwd = l);
        pq.loadingBackwards$.subscribe(l => bwd = l);
        pq.items$.subscribe();
        await flush();
        expect(fwd).toBe(true);
        expect(bwd).toBe(false);
        source.next([1, 2]);
        source.complete();
        await flush();
        expect(fwd).toBe(false);
        expect(bwd).toBe(false);
    });

    it("reports loadingBackwards$ for the in-flight backwards page only", async () => {
        const fwdSource = new Subject<number[]>();
        const bwdSource = new Subject<number[]>();
        const pq = pagedQuery<number>(newClient(), {
            queryKey: ["p", 8],
            loadPage: (dir: PageDirection) => dir === "forwards" ? fwdSource : bwdSource,
            sort: asc, pageSize: 2,
        });
        let fwd = false, bwd = false;
        pq.loadingForwards$.subscribe(l => fwd = l);
        pq.loadingBackwards$.subscribe(l => bwd = l);
        pq.items$.subscribe();
        await flush();
        fwdSource.next([10, 11]);
        fwdSource.complete();
        await flush();
        expect(fwd).toBe(false);
        pq.loadMore("backwards");
        await flush();
        expect(bwd).toBe(true);
        expect(fwd).toBe(false);
        bwdSource.next([9, 8]);
        bwdSource.complete();
        await flush();
        expect(bwd).toBe(false);
    });

    it("keeps loading$ true while either direction is loading", async () => {
        const fwdSource = new Subject<number[]>();
        const bwdSource = new Subject<number[]>();
        const pq = pagedQuery<number>(newClient(), {
            queryKey: ["p", 9],
            loadPage: (dir: PageDirection) => dir === "forwards" ? fwdSource : bwdSource,
            sort: asc, pageSize: 2,
        });
        let loading = false;
        pq.loading$.subscribe(l => loading = l);
        pq.items$.subscribe();
        await flush();
        fwdSource.next([10, 11]);
        fwdSource.complete();
        await flush();
        expect(loading).toBe(false);
        pq.loadMore("backwards");
        await flush();
        expect(loading).toBe(true);
        bwdSource.next([9, 8]);
        bwdSource.complete();
        await flush();
        expect(loading).toBe(false);
    });

    it("refetch() refreshes all loaded pages in place", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 10], loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2 });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        pq.loadMore("forwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]);
        pq.refetch();
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]); // both pages kept & refreshed
        expect(pq.hasMore("forwards")).toBe(true); // last loaded page was full, so more remains
    });

    it("evicts its query from the cache when the last subscriber leaves (fresh load on remount, no cross-navigation persistence)", async () => {
        const client = newClient();
        const pq = pagedQuery<number>(client, { queryKey: ["p", "gc"], loadPage: dataset([10, 11, 12, 13]), sort: asc, pageSize: 2 });

        const sub = pq.items$.subscribe();
        await flush();
        expect(client.getQueryCache().getAll().length).toBe(1);

        sub.unsubscribe();
        await flush();
        // The appointments list rebuilds from scratch on each navigation, so its query must NOT
        // linger in the cache after the view is torn down — otherwise a revisit paints stale pages.
        expect(client.getQueryCache().getAll().length).toBe(0);
    });

    it("emits the error on error$ when a page fails", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 11], loadPage: () => throwError(() => new Error("nope")), sort: asc });
        const errors: unknown[] = [];
        pq.error$.subscribe(e => errors.push(e));
        pq.items$.subscribe();
        await flush();
        expect((errors[errors.length - 1] as Error)?.message).toBe("nope");
    });

    it("surfaces an error when a page is not sorted per the sort predicate", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 12], loadPage: dataset([2, 1]), sort: asc, pageSize: 2 });
        const errors: unknown[] = [];
        pq.error$.subscribe(e => errors.push(e));
        pq.items$.subscribe();
        await flush();
        expect(errors[errors.length - 1]).toBeTruthy();
    });
});
