import { Injectable } from "@angular/core";
import { QueryClient } from "@tanstack/query-core";

/** A hierarchical cache key, e.g. `['appointment', 'detail', 5]`. */
export type CacheKey = readonly unknown[];

/**
 * The seam's invalidation surface over the TanStack Query cache.
 *
 * Mutation sites call `invalidate(...mutationKeys)`; TanStack marks every matching query
 * stale (prefix match) and refetches the active ones in the background. `clear()` wipes the
 * whole cache — used as a hard tenant boundary on facility switch / logout.
 */
@Injectable({ providedIn: "root" })
export class CacheCoordinator {
    constructor(private client: QueryClient) { }

    invalidate(...keys: CacheKey[]): void {
        for (const key of keys)
            this.client.invalidateQueries({ queryKey: key as unknown[] });
    }

    clear(): void {
        this.client.clear();
    }
}
