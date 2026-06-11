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
 * The shape {@link BaseModelService} needs from an entity's key factory: the entity-wide `all`
 * key (used by the inherited `getAll()` and as the first invalidation key), and an optional
 * `detail(id)` factory that `getById` uses to build its own key. Entities without a by-id read
 * (e.g. working hours) omit `detail`.
 */
export interface EntityKeyFactory {
    readonly all: CacheKey;
    detail?(id: any): CacheKey;
}

export const appointmentKeys = {
    all: ["appointment"] as const,
    list: (date: string) => ["appointment", "list", date] as const,
    detail: (id: number) => ["appointment", "detail", id] as const,
};

export const clientKeys = {
    all: ["client"] as const,
    list: (archived: boolean) => ["client", "list", archived] as const,
    detail: (id: number) => ["client", "detail", id] as const,
};

export const serviceKeys = {
    all: ["service"] as const,
    list: (archived: boolean) => ["service", "list", archived] as const,
    detail: (id: number) => ["service", "detail", id] as const,
};

export const workingHourKeys = {
    all: ["workingHour"] as const,
};
