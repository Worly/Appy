import { QueryClient } from "@tanstack/query-core";
import { Subject, of, throwError } from "rxjs";
import { Page, pagedQuery } from "./paged-query";
import { PageDirection } from "./contracts";

const flush = () => new Promise<void>(resolve => setTimeout(resolve));
const newClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

/** Builds a loadPage that slices fixed forwards/backwards datasets by skip/take, with empty extras. */
function dataset(forwards: number[], backwards: number[] = []) {
    return (dir: PageDirection, skip: number, take: number) =>
        of({ items: (dir === "forwards" ? forwards : backwards).slice(skip, skip + take), extra: [] as never[] });
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
        const source = new Subject<Page<number, never>>();
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 6], loadPage: () => source, pageSize: 2 });
        const loadings: boolean[] = [];
        pq.loading$.subscribe(l => loadings.push(l));
        pq.items$.subscribe();
        await flush();
        expect(loadings[loadings.length - 1]).toBe(true);
        source.next({ items: [1, 2], extra: [] });
        source.complete();
        await flush();
        expect(loadings[loadings.length - 1]).toBe(false);
    });

    it("reports loadingForwards$ for the initial forwards page", async () => {
        const source = new Subject<Page<number, never>>();
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 7], loadPage: () => source, pageSize: 2 });
        let fwd = false, bwd = false;
        pq.loadingForwards$.subscribe(l => fwd = l);
        pq.loadingBackwards$.subscribe(l => bwd = l);
        pq.items$.subscribe();
        await flush();
        expect(fwd).toBe(true);
        expect(bwd).toBe(false);
        source.next({ items: [1, 2], extra: [] });
        source.complete();
        await flush();
        expect(fwd).toBe(false);
        expect(bwd).toBe(false);
    });

    it("reports loadingBackwards$ for the in-flight backwards page only", async () => {
        const fwdSource = new Subject<Page<number, never>>();
        const bwdSource = new Subject<Page<number, never>>();
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
        fwdSource.next({ items: [10, 11], extra: [] });
        fwdSource.complete();
        await flush();
        expect(fwd).toBe(false);
        pq.loadMore("backwards");
        await flush();
        expect(bwd).toBe(true);
        expect(fwd).toBe(false);
        bwdSource.next({ items: [9, 8], extra: [] });
        bwdSource.complete();
        await flush();
        expect(bwd).toBe(false);
    });

    it("scopes loading$ to the initial anchor load — later directional fetches don't flip it", async () => {
        const fwdSource = new Subject<Page<number, never>>();
        const bwdSource = new Subject<Page<number, never>>();
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
        fwdSource.next({ items: [10, 11], extra: [] });
        fwdSource.complete();
        await flush();
        expect(loading).toBe(false);
        // A subsequent directional fetch must NOT flip loading$ — that's what loadingBackwards$ is for.
        pq.loadMore("backwards");
        await flush();
        expect(loading).toBe(false);
        bwdSource.next({ items: [9, 8], extra: [] });
        bwdSource.complete();
        await flush();
        expect(loading).toBe(false);
    });

    it("reports loadingForwards$ during a loadMore('forwards') and fetches each next page only once", async () => {
        const sources: Subject<Page<number, never>>[] = [];
        let calls = 0;
        const pq = pagedQuery<number>(newClient(), {
            queryKey: ["p", "fwd-more"],
            loadPage: () => { calls++; const s = new Subject<Page<number, never>>(); sources.push(s); return s; },
            pageSize: 2,
        });
        let fwd = false;
        pq.loadingForwards$.subscribe(l => fwd = l);
        pq.items$.subscribe();
        await flush();
        sources[0].next({ items: [10, 11], extra: [] }); // full initial anchor page → another page remains
        sources[0].complete();
        await flush();
        expect(fwd).toBe(false);
        expect(calls).toBe(1);

        pq.loadMore("forwards");
        await flush();
        expect(fwd).toBe(true); // the next page is in flight → forwards spinner is on
        expect(calls).toBe(2);

        // A stream of scroll events fires loadMore again while the page is still loading — no extra GETs.
        pq.loadMore("forwards");
        pq.loadMore("forwards");
        await flush();
        expect(calls).toBe(2);

        sources[1].next({ items: [12, 13], extra: [] });
        sources[1].complete();
        await flush();
        expect(fwd).toBe(false);
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

    it("preserves all pages (anchor + backwards) when a bidirectional list is refetched", async () => {
        // Reproduces the cache-revisit bug: after a full backwards page is prepended it sits first in
        // the page list, and TanStack's refetch reconstructs pages by walking forward from page 0 via
        // getNextPageParam. If that walk treats the backwards page as a forwards one, the anchor slot is
        // re-fetched at the wrong skip (empty here) and the anchor's items vanish + hasNextPage flips false.
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", "refetch-bidi"], loadPage: dataset([10, 11], [9, 8]), pageSize: 2 });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        pq.loadMore("backwards");
        await flush();
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]);
        expect(pq.hasMore("forwards")).toBe(true);

        pq.refetch();
        await flush();
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]); // anchor [10, 11] must survive the refetch
        expect(pq.hasMore("forwards")).toBe(true);
    });

    it("a loadMore fired during an in-flight refetch must not clobber the refetch's fresh pages", async () => {
        // Reproduces the warm-cache revisit bug: on a fresh mount over cached pages, the
        // observer's refetch (refetchOnMount) and the list's auto-backwards-pagination fire
        // together. fetchPreviousPage defaults to cancelRefetch:true, so it cancels the in-flight
        // refetch and commits its pre-refetch snapshot — clobbering the just-edited anchor page
        // with the stale one. A directional loadMore must therefore wait for a refetch to settle.
        const pending: { dir: PageDirection; skip: number; subject: Subject<Page<number, never>>; done: boolean }[] = [];
        let forwards = [10, 11];
        let backwards = [9, 8];
        const loadPage = (dir: PageDirection, skip: number, _take: number) => {
            const subject = new Subject<Page<number, never>>();
            pending.push({ dir, skip, subject, done: false });
            return subject;
        };
        // Resolve every in-flight fetch with the current backend slice, in waves — an infinite
        // refetch spawns its page fetches sequentially (index -1, then index 0), so each wave can
        // reveal the next fetch. Loops until no fetch is left pending.
        const drain = async () => {
            for (let i = 0; i < 10; i++) {
                const inflight = pending.filter(p => !p.done);
                if (inflight.length === 0) break;
                for (const e of inflight) {
                    e.done = true;
                    e.subject.next({ items: (e.dir === "forwards" ? forwards : backwards).slice(e.skip, e.skip + 2), extra: [] });
                    e.subject.complete();
                }
                await flush();
            }
        };

        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", "refetch-race"], loadPage, pageSize: 2 });
        const emissions: number[][] = [];
        pq.items$.subscribe(i => emissions.push(i));
        await flush();
        await drain();            // anchor [10, 11]
        pq.loadMore("backwards");
        await flush();
        await drain();            // prepend [8, 9] → [8, 9, 10, 11]
        expect(lastEmission(emissions)).toEqual([8, 9, 10, 11]);

        // An edit changes the anchor's first item: 10 → 99.
        forwards = [99, 11];
        backwards = [9, 8, 7, 6]; // older history available, should a prepend run after the refetch

        // Warm-remount: a background refetch starts, and in the same tick the list's
        // auto-backwards-pagination fires a loadMore — they race on the same query.
        pq.refetch();
        await flush();            // refetch is now in flight (its first page fetch is unresolved)
        pq.loadMore("backwards"); // must NOT cancel/clobber the in-flight refetch
        await drain();

        const items = lastEmission(emissions);
        expect(items).toContain(99);     // the refetch's fresh anchor survived
        expect(items).not.toContain(10); // the stale anchor value is gone
    });

    it("emits the error on error$ when a page fails", async () => {
        const pq = pagedQuery<number>(newClient(), { queryKey: ["p", 11], loadPage: () => throwError(() => new Error("nope")), pageSize: 2 });
        const errors: unknown[] = [];
        pq.error$.subscribe(e => errors.push(e));
        pq.items$.subscribe();
        await flush();
        expect((errors[errors.length - 1] as Error)?.message).toBe("nope");
    });

    it("accumulates per-page extras across forwards and backwards pages via extras$", async () => {
        const loadPage = (dir: PageDirection, skip: number, take: number) => {
            const arr = dir === "forwards" ? [10, 11, 12, 13] : [9, 8, 7, 6];
            const items = arr.slice(skip, skip + take);
            return of({ items, extra: items.map(n => `e${n}`) });
        };
        const pq = pagedQuery<number, string>(newClient(), { queryKey: ["p", "extras"], loadPage, pageSize: 2 });
        const extras: string[][] = [];
        pq.extras$.subscribe(e => extras.push(e));
        pq.items$.subscribe();
        await flush();
        expect(lastEmission(extras)).toEqual(["e10", "e11"]);

        pq.loadMore("backwards");
        await flush();
        // backwards page [9,8] (descending) is reversed → its extras ["e9","e8"] become ["e8","e9"], then the anchor's.
        expect(lastEmission(extras)).toEqual(["e8", "e9", "e10", "e11"]);

        pq.loadMore("forwards");
        await flush();
        // a second forwards page [12,13] appends its extras after the existing buffer.
        expect(lastEmission(extras)).toEqual(["e8", "e9", "e10", "e11", "e12", "e13"]);
    });

    it("page$ pairs items and extras from the same emission (never a stale pair)", async () => {
        const loadPage = (dir: PageDirection, skip: number, take: number) => {
            const arr = dir === "forwards" ? [10, 11, 12, 13] : [9, 8, 7, 6];
            const items = arr.slice(skip, skip + take);
            return of({ items, extra: items.map(n => `e${n}`) });
        };
        const pq = pagedQuery<number, string>(newClient(), { queryKey: ["p", "page"], loadPage, pageSize: 2 });
        const pages: { items: number[]; extras: string[] }[] = [];
        pq.page$.subscribe(p => pages.push(p));
        await flush();

        // The invariant the combined stream guarantees: in EVERY emission the extras correspond 1:1 to
        // that same emission's items — never new items paired with the previous page's extras (the
        // stale-pair flash that combining items$/extras$ would produce on each transition).
        const consistent = (ps: typeof pages) => ps.every(p => JSON.stringify(p.extras) === JSON.stringify(p.items.map(n => `e${n}`)));

        expect(consistent(pages)).toBe(true);
        expect(pages[pages.length - 1]).toEqual({ items: [10, 11], extras: ["e10", "e11"] });

        pq.loadMore("forwards");
        await flush();
        expect(consistent(pages)).toBe(true);
        expect(pages[pages.length - 1]).toEqual({ items: [10, 11, 12, 13], extras: ["e10", "e11", "e12", "e13"] });
    });
});
