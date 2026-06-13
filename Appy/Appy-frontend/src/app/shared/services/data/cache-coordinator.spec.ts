import { QueryClient, QueryObserver } from "@tanstack/query-core";
import { CacheCoordinator } from "./cache-coordinator";
import { clientKeys } from "./keys";

const flush = () => new Promise<void>(resolve => setTimeout(resolve));

describe("CacheCoordinator", () => {
    it("invalidate() refetches a live observer whose key matches (prefix match)", async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const cache = new CacheCoordinator(client);

        let calls = 0;
        const observer = new QueryObserver(client, {
            queryKey: clientKeys.list(false) as unknown as unknown[],
            queryFn: async () => { calls++; return calls; },
            staleTime: Infinity, // so only invalidation (not staleness) can trigger a refetch
        });
        const unsub = observer.subscribe(() => { });
        await flush();
        expect(calls).toBeGreaterThan(0);
        const callsAfterFirst = calls;

        cache.invalidate(clientKeys.all); // prefix ["client"] matches ["client","list",false]
        await flush();

        expect(calls).toBeGreaterThan(callsAfterFirst);
        unsub();
    });

    it("clear() empties the cache", async () => {
        const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
        const cache = new CacheCoordinator(client);

        const observer = new QueryObserver(client, {
            queryKey: clientKeys.list(false) as unknown as unknown[],
            queryFn: async () => 1,
            staleTime: Infinity,
        });
        const unsub = observer.subscribe(() => { });
        await flush();
        expect(client.getQueryCache().getAll().length).toBe(1);

        unsub();
        cache.clear();
        expect(client.getQueryCache().getAll().length).toBe(0);
    });
});
