import { QueryClient } from "@tanstack/query-core";
import { Subject, of, throwError } from "rxjs";
import { pagedQuery } from "./paged-query";
import { PageDirection } from "./contracts";

const flush = () => new Promise<void>(resolve => setTimeout(resolve));
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
    it("loads the first forwards page on subscription and emits it", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 1], loadPage: dataset([10, 11, 12, 13]), pageSize: 2 });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11]);
    });

    it("appends the next page on loadMore('forwards')", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 2], loadPage: dataset([10, 11, 12, 13]), pageSize: 2 });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        pq.loadMore("forwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]);
    });

    it("prepends earlier items on loadMore('backwards') by reversing the descending backwards pages", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 3], loadPage: dataset([10, 11], [9, 8, 7, 6]), pageSize: 2 });
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
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 4], loadPage: dataset([10, 11, 12]), pageSize: 2 });
        pq.items$.subscribe();
        await flush();
        expect(pq.hasMore("forwards")).toBe(true);
        pq.loadMore("forwards");
        await flush();
        expect(pq.hasMore("forwards")).toBe(false);
    });

    it("reports loading true while a page is in flight and false once it resolves", async () => {
        const source = new Subject<number[]>();
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 6], loadPage: () => source, pageSize: 2 });
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
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 7], loadPage: () => source, pageSize: 2 });
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
            pageSize: 2,
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

    it("scopes loading$ to the initial anchor load — later directional fetches don't flip it", async () => {
        const fwdSource = new Subject<number[]>();
        const bwdSource = new Subject<number[]>();
        const pq = pagedQuery<number>(newClient(), {
            queryKey: ["p", 9],
            loadPage: (dir: PageDirection) => dir === "forwards" ? fwdSource : bwdSource,
            pageSize: 2,
        });
        let loading = false;
        pq.loading$.subscribe(l => loading = l);
        pq.items$.subscribe();
        await flush();
        expect(loading).toBe(true); // initial anchor load, no data yet
        fwdSource.next([10, 11]);
        fwdSource.complete();
        await flush();
        expect(loading).toBe(false);
        // A subsequent directional fetch must NOT flip loading$ — that's what loadingBackwards$ is for.
        pq.loadMore("backwards");
        await flush();
        expect(loading).toBe(false);
        bwdSource.next([9, 8]);
        bwdSource.complete();
        await flush();
        expect(loading).toBe(false);
    });

    it("refetch() refreshes all loaded pages in place", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 10], loadPage: dataset([10, 11, 12, 13]), pageSize: 2 });
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

    it("emits the error on error$ when a page fails", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 11], loadPage: () => throwError(() => new Error("nope")), pageSize: 2 });
        const errors: unknown[] = [];
        pq.error$.subscribe(e => errors.push(e));
        pq.items$.subscribe();
        await flush();
        expect((errors[errors.length - 1] as Error)?.message).toBe("nope");
    });
});
