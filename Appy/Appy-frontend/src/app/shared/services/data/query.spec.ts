import { Subject, of, throwError } from "rxjs";
import { query } from "./query";

describe("query()", () => {
    it("does not call fetchFn until data$ is subscribed (lazy)", () => {
        let calls = 0;
        const q = query(() => { calls++; return of(1); });

        expect(calls).toBe(0);

        q.data$.subscribe();
        expect(calls).toBe(1);
    });

    it("emits the fetched value on data$", () => {
        const q = query(() => of(42));

        const values: (number | undefined)[] = [];
        q.data$.subscribe(v => values.push(v));

        expect(values).toEqual([42]);
    });

    it("reports loading true while in flight and false once resolved", () => {
        const source = new Subject<number>();
        const q = query(() => source);

        const loadings: boolean[] = [];
        q.loading$.subscribe(l => loadings.push(l));
        q.data$.subscribe();

        expect(loadings[loadings.length - 1]).toBe(true);

        source.next(7);
        source.complete();

        expect(loadings[loadings.length - 1]).toBe(false);
    });

    it("shares a single in-flight fetch across multiple data$ subscribers", () => {
        let calls = 0;
        const source = new Subject<number>();
        const q = query(() => { calls++; return source; });

        q.data$.subscribe();
        q.data$.subscribe();

        expect(calls).toBe(1);
    });

    it("re-runs fetchFn on refetch()", () => {
        let calls = 0;
        const q = query(() => { calls++; return of(calls); });

        const values: (number | undefined)[] = [];
        q.data$.subscribe(v => values.push(v));
        expect(values).toEqual([1]);

        q.refetch();
        expect(values).toEqual([1, 2]);
    });

    it("emits the error on error$ and clears loading", () => {
        const q = query(() => throwError(() => new Error("boom")));

        const errors: unknown[] = [];
        const loadings: boolean[] = [];
        q.error$.subscribe(e => errors.push(e));
        q.loading$.subscribe(l => loadings.push(l));
        q.data$.subscribe();

        expect((errors[errors.length - 1] as Error)?.message).toBe("boom");
        expect(loadings[loadings.length - 1]).toBe(false);
    });
});
