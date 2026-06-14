import { CacheKey } from "./cache-coordinator";

/**
 * The TanStack Query cache keys for every entity.
 *
 * Reads are keyed by these factories (`getById` → `detail(id)`, `getAll` → `list(...)`), and
 * mutation sites invalidate by them (see {@link CacheCoordinator}) — typed, so they can't
 * reference nonexistent keys. Invalidations include cross-entity dependencies: a client or
 * service edit invalidates `appointmentKeys.all` too, because appointments embed both.
 */

/**
 * The shape every entity key factory implements (enforced via `satisfies` below). `all` is the
 * entity-wide key (used by the inherited `getAll()` and as the first invalidation key); `detail(id)`
 * is what `getById` builds its key from; `list(...)` is the per-discriminator list key. `detail` and
 * `list` are optional — entities without a by-id read (e.g. working hours) omit them.
 */
export interface EntityKeyFactory {
    readonly all: CacheKey;
    detail?(id: any): CacheKey;
    list?(...args: any[]): CacheKey;
}

export const appointmentKeys = {
    all: ["appointment"] as const,
    list: (date: string) => ["appointment", "list", date] as const,
    detail: (id: number) => ["appointment", "detail", id] as const,
} satisfies EntityKeyFactory;

export const clientKeys = {
    all: ["client"] as const,
    list: (archived: boolean) => ["client", "list", archived] as const,
    detail: (id: number) => ["client", "detail", id] as const,
} satisfies EntityKeyFactory;

export const serviceKeys = {
    all: ["service"] as const,
    list: (archived: boolean) => ["service", "list", archived] as const,
    detail: (id: number) => ["service", "detail", id] as const,
} satisfies EntityKeyFactory;

export const workingHourKeys = {
    all: ["workingHour"] as const,
} satisfies EntityKeyFactory;

export const timeOffKeys = {
    all: ["timeOff"] as const,
    detail: (id: number) => ["timeOff", "detail", id] as const,
} satisfies EntityKeyFactory;
