# CLAUDE.md — Frontend Utilities (src/app/utils/)

Pure helper functions with no Angular DI. Importable anywhere and unit-testable without the Angular testing infrastructure.

| File | Purpose |
|------|---------|
| `time-utils.ts` | Duration parsing, time-only extraction, range overlap, and gap measurement between two intervals |
| `list-timeline.ts` | Builds the appointments-list day timeline and groups items into content-days |
| `group-by.ts` | Buckets an array by a derived key |
| `smart-subscriber.ts` | An Observable that emits when its observer unsubscribes, for teardown logic |
| `material-dayjs-adapter.ts` | Angular Material `DateAdapter` backed by dayjs |
| `dynamic-url-params.ts` | Reads and writes URL query parameters reactively |
| `search.ts` | Full-text search helpers for client-side list filtering |
| `smart-caching.ts` | Cache-aside wrapper for expensive computations |
| `invert-times.ts` | Turns occupied intervals in a day into the remaining free ones |
| `rendered-interval.ts` | Maps time ranges to pixel positions for the appointments scroller |
| `tween.ts` | Linear tweening for animated scroll |

## Rule

Import as plain functions — don't wrap them in Angular services unless HTTP or DI is genuinely needed. Keep them side-effect-free.
