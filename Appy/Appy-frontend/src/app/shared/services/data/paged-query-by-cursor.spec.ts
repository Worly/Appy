import { QueryClient } from "@tanstack/query-core";
import { of } from "rxjs";
import { CursorPage, pagedQueryByCursor } from "./paged-query-by-cursor";
import { PageDirection } from "./contracts";

const flush = () => new Promise<void>(resolve => setTimeout(resolve));
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const lastEmission = <T>(e: T[][]): T[] => e[e.length - 1];

/**
 * A loadPage over a fixed ascending set of content-days (numbers). Forwards = the first `take`
 * days >= cursor; backwards = the last `take` days < cursor (ascending). Cursors are stringified
 * day numbers. Mirrors the real backend contract closely enough to exercise the builder.
 */
function dataset(days: number[], take: number) {
    return (dir: PageDirection, cursor: string) => {
        const c = parseInt(cursor, 10);
        const window = dir === "forwards"
            ? days.filter(d => d >= c).slice(0, take)
            : days.filter(d => d < c).slice(-take);
        const nextCursor = window.length > 0 && days.some(d => d > window[window.length - 1])
            ? String(window[window.length - 1] + 1) : null;
        const prevBase = window.length > 0 ? window[0] : c;
        const prevCursor = days.some(d => d < prevBase) ? String(prevBase) : null;
        return of<CursorPage<number, never>>({ items: window, extra: [], nextCursor, prevCursor });
    };
}

describe("pagedQueryByCursor()", () => {
    it("loads the first forwards page from the anchor", async () => {
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", 1], anchor: "10", loadPage: dataset([10, 11, 12, 13], 2) });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11]);
    });

    it("appends the next page on loadMore('forwards')", async () => {
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", 2], anchor: "10", loadPage: dataset([10, 11, 12, 13], 2) });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        pq.loadMore("forwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11, 12, 13]);
    });

    it("prepends earlier days on loadMore('backwards'), kept ascending", async () => {
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", 3], anchor: "10", loadPage: dataset([6, 7, 8, 9, 10, 11], 2) });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        expect(lastEmission(emissions)).toEqual([10, 11]);
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]);
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([6, 7, 8, 9, 10, 11]);
    });

    it("reports hasMore('forwards') false once nextCursor is null", async () => {
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", 4], anchor: "10", loadPage: dataset([10, 11, 12], 2) });
        pq.items$.subscribe();
        await flush();
        expect(pq.hasMore("forwards")).toBe(true);
        pq.loadMore("forwards");
        await flush();
        expect(pq.hasMore("forwards")).toBe(false);
    });

    it("stops backwards at the earliest content (prevCursor null)", async () => {
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", 5], anchor: "10", loadPage: dataset([9, 10, 11], 2) });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        expect(pq.hasMore("backwards")).toBe(true);
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([9, 10, 11]);
        expect(pq.hasMore("backwards")).toBe(false);
    });

    it("preserves anchor + backwards pages when the bidirectional list is refetched", async () => {
        // The load-bearing test: on refetch TanStack walks the whole page chain forward via
        // getNextPageParam starting from the first (most-backward) page. Because pages are ascending
        // and each carries nextCursor = day-after-its-max, re-fetching a backwards page forwards yields
        // the same days, so the anchor slot must survive.
        const pq = pagedQueryByCursor<number>(newClient(), { queryKey: ["c", "refetch"], anchor: "10", loadPage: dataset([8, 9, 10, 11], 2) });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]);
        pq.refetch();
        await flush();
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]); // anchor [10, 11] survived
    });

    it("accumulates per-page extras in display order via extras$", async () => {
        const loadPage = (dir: PageDirection, cursor: string) => {
            const days = [8, 9, 10, 11];
            const c = parseInt(cursor, 10);
            const window = dir === "forwards" ? days.filter(d => d >= c).slice(0, 2) : days.filter(d => d < c).slice(-2);
            const nextCursor = window.length && days.some(d => d > window[window.length - 1]) ? String(window[window.length - 1] + 1) : null;
            const prevBase = window.length ? window[0] : c;
            const prevCursor = days.some(d => d < prevBase) ? String(prevBase) : null;
            return of<CursorPage<number, string>>({ items: window, extra: window.map(n => `e${n}`), nextCursor, prevCursor });
        };
        const pq = pagedQueryByCursor<number, string>(newClient(), { queryKey: ["c", "extras"], anchor: "10", loadPage });
        const extras: string[][] = [];
        pq.extras$.subscribe(e => extras.push(e));
        pq.items$.subscribe();
        await flush();
        expect(lastEmission(extras)).toEqual(["e10", "e11"]);
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(extras)).toEqual(["e8", "e9", "e10", "e11"]);
    });
});
