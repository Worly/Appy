import { Injectable } from "@angular/core";

/** A hierarchical cache key, e.g. `['appointment', 'detail', 5]`. */
export type CacheKey = readonly unknown[];

/**
 * Leave-space hook for a future cache.
 *
 * No-op today: data is allowed to go stale (acceptable for this app). Mutation sites
 * still declare their invalidations now — typed against the key factories — so the day
 * a real caching library lands, this method gets a body and nothing else has to change.
 */
@Injectable({ providedIn: "root" })
export class CacheCoordinator {
    invalidate(...keys: CacheKey[]): void {
        /* intentionally nothing */
    }
}
