# CLAUDE.md — Frontend Utilities (src/app/utils/)

Pure helper functions with no Angular DI dependencies. Safe to import anywhere and unit-testable without the Angular testing infrastructure.

## Key Utilities

| File | Contents |
|------|----------|
| `time-utils.ts` | `parseDuration()` — string to dayjs Duration; `timeOnly()` — strip date from a datetime; `overlap()` — test whether two time ranges intersect |
| `array-utils.ts` | `isSorted()`, `getInsertIndex()` (binary search), `isBefore()`, `isAfter()` — for maintaining sorted arrays efficiently |
| `group-by.ts` | `groupBy(array, keyFn)` — bucket array items by a derived key |
| `smart-subscriber.ts` | `onUnsubscribed()` — Observable that emits when its observer unsubscribes (useful for teardown logic) |
| `material-dayjs-adapter.ts` | Custom Angular Material `DateAdapter` that uses dayjs instead of the default Moment.js adapter |
| `dynamic-url-params.ts` | Read and write URL query parameters reactively |
| `search.ts` | Full-text search helpers for client-side list filtering |
| `smart-caching.ts` | Cache-aside wrapper for expensive computations |
| `invert-times.ts` | Given a set of occupied intervals in a day, compute the remaining free intervals |
| `rendered-interval.ts` | Translate time ranges to pixel positions for the appointments scroller view |
| `tween.ts` | Simple linear tweening for smooth animated scroll |

## Rule

Import as plain functions — do not wrap in Angular services unless HTTP or DI is genuinely needed. Keep all functions side-effect-free.
