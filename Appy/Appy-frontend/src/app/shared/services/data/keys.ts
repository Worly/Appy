/**
 * Frozen key vocabulary for any future cache.
 *
 * Mutation sites declare invalidations against these factories (see {@link CacheCoordinator}),
 * so they are typed and can't reference nonexistent keys. They do nothing today — they
 * pre-wire the day a real cache lands, including the cross-entity dependencies (a client
 * or service edit invalidates appointments, because appointments embed both).
 */

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
