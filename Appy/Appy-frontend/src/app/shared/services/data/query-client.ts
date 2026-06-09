import { QueryClient } from "@tanstack/query-core";

/**
 * Single app-wide TanStack Query cache. Provided in AppModule and injected wherever
 * the data seam needs it (CacheCoordinator, BaseModelService).
 *
 * Defaults chosen to match the app's previous "stale is fine, refetch is cheap" behaviour:
 * - staleTime 0      → every fresh observer revalidates (instant cached paint, then refetch)
 * - retry false      → matches the old no-retry behaviour; keeps error toasts/tests immediate
 * - refetchOnWindowFocus false → predictable; this is not a live dashboard
 * - gcTime default (5 min) → route-reuse revisits get an instant cached paint
 */
export function createQueryClient(): QueryClient {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 0,
                retry: false,
                refetchOnWindowFocus: false,
            },
        },
    });
}
