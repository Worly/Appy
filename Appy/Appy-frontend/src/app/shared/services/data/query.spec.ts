import { QueryClient } from "@tanstack/query-core";
import { Subject, of, throwError } from "rxjs";
import { query } from "./query";

const flush = () => new Promise<void>(resolve => setTimeout(resolve));
const newClient = (staleTime = 0) =>
    new QueryClient({ defaultOptions: { queries: { retry: false, staleTime } } });

describe("query()", () => {
    it("does not call fetchFn until data$ is subscribed (lazy)", () => {
        const client = newClient();
        let calls = 0;
        const q = query(client, ["t", "lazy"], () => { calls++; return of(1); });

        expect(calls).toBe(0);

        q.data$.subscribe();
        expect(calls).toBe(1); // queryFn is invoked synchronously on subscribe
    });

    it("emits the fetched value on data$", async () => {
        const client = newClient();
        const q = query(client, ["t", "value"], () => of(42));

        const values: (number | undefined)[] = [];
        q.data$.subscribe(v => values.push(v));
        await flush();

        expect(values[values.length - 1]).toBe(42);
    });

    it("reports loading true while in flight and false once resolved", async () => {
        const client = newClient();
        const source = new Subject<number>();
        const q = query(client, ["t", "loading"], () => source);

        const loadings: boolean[] = [];
        q.loading$.subscribe(l => loadings.push(l));
        q.data$.subscribe();
        await flush();

        expect(loadings[loadings.length - 1]).toBe(true);

        source.next(7);
        source.complete();
        await flush();

        expect(loadings[loadings.length - 1]).toBe(false);
    });

    it("shares a single in-flight fetch across multiple data$ subscribers", () => {
        const client = newClient();
        let calls = 0;
        const source = new Subject<number>();
        const q = query(client, ["t", "share"], () => { calls++; return source; });

        q.data$.subscribe();
        q.data$.subscribe();

        expect(calls).toBe(1);
    });

    it("serves a cached value to a second same-key query without refetching", async () => {
        const client = newClient(Infinity); // fresh forever → no revalidation
        let calls = 0;
        const q1 = query(client, ["t", "cache"], () => { calls++; return of(99); });
        q1.data$.subscribe();
        await flush();
        expect(calls).toBe(1);

        const q2 = query(client, ["t", "cache"], () => { calls++; return of(99); });
        const values: (number | undefined)[] = [];
        q2.data$.subscribe(v => values.push(v));
        await flush();

        expect(values[values.length - 1]).toBe(99);
        expect(calls).toBe(1); // second observer read from cache, did not refetch
    });

    it("re-runs fetchFn on refetch()", async () => {
        const client = newClient();
        let calls = 0;
        const q = query(client, ["t", "refetch"], () => { calls++; return of(calls); });

        const values: (number | undefined)[] = [];
        q.data$.subscribe(v => values.push(v));
        await flush();
        expect(values[values.length - 1]).toBe(1);

        q.refetch();
        await flush();
        expect(values[values.length - 1]).toBe(2);
    });

    it("emits the error on error$ and clears loading", async () => {
        const client = newClient();
        const q = query(client, ["t", "error"], () => throwError(() => new Error("boom")));

        const errors: unknown[] = [];
        const loadings: boolean[] = [];
        q.error$.subscribe(e => errors.push(e));
        q.loading$.subscribe(l => loadings.push(l));
        q.data$.subscribe();
        await flush();

        expect((errors[errors.length - 1] as Error)?.message).toBe("boom");
        expect(loadings[loadings.length - 1]).toBe(false);
    });
});
