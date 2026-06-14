# List-view time-offs combined into the appointment page response — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the appointments list view return each page's time-off occurrences in the same response as its appointments, so they render atomically with no pop-in.

**Architecture:** The backend list endpoint returns an `AppointmentListPageDTO` envelope (appointments + that page's time-offs). The frontend paged data seam (`pagedQuery`/`PagedResult`) is generalized with a per-page `extra`/`extras$` sidecar; the list component reads time-offs from `extras$` and renders both via `combineLatest`, dropping its separate `getForRange` fetch.

**Tech Stack:** ASP.NET Core 8 (xUnit + Moq), Angular 16 (Karma/Jasmine), TanStack Query (`@tanstack/query-core`).

**Spec:** `docs/superpowers/specs/2026-06-14-list-view-timeoff-combined-design.md`

---

## File structure

**Backend**
- Create `Appy/DTOs/AppointmentListPageDTO.cs` — the page envelope.
- Modify `Appy/DTOs/TimeOffOccurrenceDTO.cs` — add `Id`.
- Modify `Appy/Services/TimeOffService.cs` — set `Id` in `ToOccurrence`.
- Modify `Appy/Services/AppointmentService.cs` — `GetList` returns the envelope (interface + impl).
- Modify `Appy/Controllers/AppointmentController.cs` — `GetList` return type.
- Modify `Appy/Controllers/TimeOffController.cs` — remove `GetForRange` endpoint.
- Tests: `Appy.Tests/Services/TimeOffServiceTests.cs`, `Appy.Tests/Services/AppointmentServiceTests.cs`.

**Frontend**
- Modify `src/app/models/time-off-occurrence.ts` — add `id`.
- Modify `src/app/shared/services/data/contracts.ts` — `PagedResult<T, E>` gains `extras$`.
- Modify `src/app/shared/services/data/paged-query.ts` — page envelope + `extras$`.
- Modify `src/app/shared/services/base-model-service.ts` — `getListAdvanced` `mapPage` arg.
- Modify `src/app/pages/appointments/services/appointment.service.ts` — `getList` splits the envelope.
- Modify `src/app/pages/appointments/components/appointments-list/appointments-list.component.ts` — `combineLatest`, dedupe, drop `loadTimeOffs`.
- Modify `src/app/pages/time-off/services/time-off.service.ts` — invalidation key + remove `getForRange`.
- Tests: `src/app/shared/services/data/paged-query.spec.ts`, `src/app/models/time-off-occurrence.spec.ts` (new).

**Docs:** `shared/CLAUDE.md`, `appointments/CLAUDE.md`, `time-off/CLAUDE.md`, `DTOs/CLAUDE.md`, `Controllers/CLAUDE.md`.

---

## Task 1: Backend — add `Id` to time-off occurrences

**Files:**
- Modify: `Appy/DTOs/TimeOffOccurrenceDTO.cs`
- Modify: `Appy/Services/TimeOffService.cs:156-164` (`ToOccurrence`)
- Test: `Appy.Tests/Services/TimeOffServiceTests.cs`

- [ ] **Step 1: Write the failing test**

Add to `Appy.Tests/Services/TimeOffServiceTests.cs` (inside the class):

```csharp
[Fact]
public async Task GetOccurrencesForRange_SetsOccurrenceIdToRuleId()
{
    timeOffs.Add(new TimeOff
    {
        Id = 42,
        FacilityId = FacilityId,
        Label = "Vacation",
        Recurrence = TimeOffRecurrence.OneOff,
        StartDate = new DateOnly(2030, 6, 1),
        EndDate = new DateOnly(2030, 6, 5),
        IsAllDay = true,
    });

    var result = await service.GetOccurrencesForRange(new DateOnly(2030, 6, 1), new DateOnly(2030, 6, 1), FacilityId);

    Assert.Single(result);
    Assert.Equal(42, result[0].Id);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test --filter "FullyQualifiedName~GetOccurrencesForRange_SetsOccurrenceIdToRuleId"`
Expected: FAIL — `TimeOffOccurrenceDTO` has no `Id` property (compile error) / value mismatch.

- [ ] **Step 3: Add `Id` to the DTO**

In `Appy/DTOs/TimeOffOccurrenceDTO.cs`, add as the first property inside the class:

```csharp
public int Id { get; set; }
```

- [ ] **Step 4: Set `Id` in `ToOccurrence`**

In `Appy/Services/TimeOffService.cs`, edit the `ToOccurrence` initializer to include `Id`:

```csharp
private static TimeOffOccurrenceDTO ToOccurrence(TimeOff t, DateOnly date) => new()
{
    Id = t.Id,
    Date = date,
    Label = t.Label,
    Notes = t.Notes,
    IsAllDay = t.IsAllDay,
    TimeFrom = t.IsAllDay ? null : t.TimeFrom,
    TimeTo = t.IsAllDay ? null : t.TimeTo,
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `dotnet test --filter "FullyQualifiedName~GetOccurrencesForRange_SetsOccurrenceIdToRuleId"`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add Appy/DTOs/TimeOffOccurrenceDTO.cs Appy/Services/TimeOffService.cs Appy.Tests/Services/TimeOffServiceTests.cs
git commit -m "feat(timeoff): add source rule Id to TimeOffOccurrenceDTO"
```

---

## Task 2: Backend — list endpoint returns appointments + time-offs envelope

**Files:**
- Create: `Appy/DTOs/AppointmentListPageDTO.cs`
- Modify: `Appy/Services/AppointmentService.cs:14` (interface), `:72-103` (impl)
- Modify: `Appy/Controllers/AppointmentController.cs:47-55`
- Test: `Appy.Tests/Services/AppointmentServiceTests.cs`

- [ ] **Step 1: Write the failing test**

Add to `Appy.Tests/Services/AppointmentServiceTests.cs` (inside the class). It seeds an appointment on 2030-01-15 and asserts the page carries the time-off the mocked `GetOccurrencesForRange` returns for that span:

```csharp
[Fact]
public async Task GetList_ReturnsTimeOffsForThePageDateSpan()
{
    AddAppointment(AppointmentStatus.Unconfirmed); // Date = 2030-01-15

    var occurrence = new TimeOffOccurrenceDTO { Id = 7, Date = new DateOnly(2030, 1, 15), Label = "Closed" };
    timeOffServiceMock
        .Setup(x => x.GetOccurrencesForRange(new DateOnly(2030, 1, 15), new DateOnly(2030, 1, 15), FacilityId))
        .ReturnsAsync(new List<TimeOffOccurrenceDTO> { occurrence });

    var result = await service.GetList(new DateOnly(2030, 1, 1), Direction.Forwards, 0, 20, null, FacilityId);

    Assert.Single(result.Appointments);
    Assert.Single(result.TimeOffs);
    Assert.Equal(7, result.TimeOffs[0].Id);
}

[Fact]
public async Task GetList_ReturnsEmptyTimeOffs_WhenNoAppointmentsOnPage()
{
    var result = await service.GetList(new DateOnly(2030, 1, 1), Direction.Forwards, 0, 20, null, FacilityId);

    Assert.Empty(result.Appointments);
    Assert.Empty(result.TimeOffs);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test --filter "FullyQualifiedName~GetList_Returns"`
Expected: FAIL — `GetList` returns `List<AppointmentViewDTO>`, which has no `.Appointments` / `.TimeOffs` (compile error).

- [ ] **Step 3: Create the envelope DTO**

Create `Appy/DTOs/AppointmentListPageDTO.cs`:

```csharp
namespace Appy.DTOs
{
    public class AppointmentListPageDTO
    {
        public List<AppointmentViewDTO> Appointments { get; set; }
        public List<TimeOffOccurrenceDTO> TimeOffs { get; set; }
    }
}
```

- [ ] **Step 4: Update the service interface**

In `Appy/Services/AppointmentService.cs`, change the interface line (currently line 14):

```csharp
Task<AppointmentListPageDTO> GetList(DateOnly date, Direction direction, int skip, int take, SmartFilter? filter, int facilityId);
```

- [ ] **Step 5: Update the service implementation**

Replace the whole `GetList` method body (currently lines 72-103) with:

```csharp
public async Task<AppointmentListPageDTO> GetList(DateOnly date, Direction direction, int skip, int take, SmartFilter? filter, int facilityId)
{
    var appointments = context.Appointments
        .Include(a => a.Service)
        .Include(a => a.Client)
        .Where(s => s.FacilityId == facilityId)
        .ApplySmartFilter(filter);

    if (direction == Direction.Forwards)
        appointments = appointments.Where(s => s.Date >= date).OrderBy(s => s.Date).ThenBy(s => s.Time).ThenBy(s => s.Duration);
    else
        appointments = appointments.Where(s => s.Date < date).OrderByDescending(s => s.Date).ThenByDescending(s => s.Time).ThenByDescending(s => s.Duration);

    var page = await appointments
        .Skip(skip)
        .Take(take)
        .Select(a => new
        {
            app = a,
            previous = context.Appointments
                .Include(a => a.Service)
                .Include(a => a.Client)
                .Where(s => s.FacilityId == a.FacilityId && s.ClientId == a.ClientId && (s.Date < a.Date || (s.Date == a.Date && s.Time < a.Time)))
                .OrderByDescending(s => s.Date)
                .ThenByDescending(s => s.Time)
                .ThenByDescending(s => s.Duration)
                .Select(a => a.ToViewDTO(null))
                .FirstOrDefault()
        })
        .Select(a => a.app.ToViewDTO(a.previous))
        .ToListAsync();

    var timeOffs = page.Count == 0
        ? new List<TimeOffOccurrenceDTO>()
        : await timeOffService.GetOccurrencesForRange(page.Min(a => a.Date), page.Max(a => a.Date), facilityId);

    return new AppointmentListPageDTO { Appointments = page, TimeOffs = timeOffs };
}
```

> Note: `AppointmentViewDTO` exposes `Date` (a `DateOnly`). If the property name differs, adjust the two `a => a.Date` selectors accordingly.

- [ ] **Step 6: Update the controller**

In `Appy/Controllers/AppointmentController.cs`, change the `GetList` action signature/return (lines 49-54):

```csharp
public async Task<ActionResult<AppointmentListPageDTO>> GetList(
    [FromQuery] DateOnly date, [FromQuery] Direction direction, [FromQuery] int skip, [FromQuery] int take, [FromQuery] SmartFilter? filter)
{
    var result = await this.appointmentService.GetList(date, direction, skip, take, filter, HttpContext.SelectedFacility());

    return Ok(result);
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `dotnet test --filter "FullyQualifiedName~AppointmentServiceTests"`
Expected: PASS (new tests + existing status-revert/AddNew tests).

- [ ] **Step 8: Commit**

```bash
git add Appy/DTOs/AppointmentListPageDTO.cs Appy/Services/AppointmentService.cs Appy/Controllers/AppointmentController.cs Appy.Tests/Services/AppointmentServiceTests.cs
git commit -m "feat(appointments): return each list page's time-offs in the response"
```

---

## Task 3: Frontend — add `id` to the `TimeOffOccurrence` model

**Files:**
- Modify: `src/app/models/time-off-occurrence.ts`
- Test: `src/app/models/time-off-occurrence.spec.ts` (create)

- [ ] **Step 1: Write the failing test**

Create `src/app/models/time-off-occurrence.spec.ts`:

```ts
import { TimeOffOccurrence } from "./time-off-occurrence";

describe("TimeOffOccurrence", () => {
    it("maps id from the DTO", () => {
        const o = new TimeOffOccurrence({ id: 42, date: "2030-06-01" });
        expect(o.id).toBe(42);
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx ng test --include='**/time-off-occurrence.spec.ts' --watch=false`
Expected: FAIL — `id` does not exist on `TimeOffOccurrence` / `TimeOffOccurrenceDTO`.

- [ ] **Step 3: Add `id` to the model and DTO**

In `src/app/models/time-off-occurrence.ts`:
- Add to `TimeOffOccurrenceDTO`: `public id?: number;` (as the first property).
- Add to `TimeOffOccurrence`: `public id?: number;` (as the first property).
- In the constructor, add as the first assignment: `this.id = dto.id;`

- [ ] **Step 4: Run test to verify it passes**

Run: `npx ng test --include='**/time-off-occurrence.spec.ts' --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/models/time-off-occurrence.ts src/app/models/time-off-occurrence.spec.ts
git commit -m "feat(timeoff): carry occurrence id on the frontend model"
```

---

## Task 4: Frontend — generalize the paged seam with a per-page sidecar

**Files:**
- Modify: `src/app/shared/services/data/contracts.ts`
- Modify: `src/app/shared/services/data/paged-query.ts`
- Modify: `src/app/shared/services/base-model-service.ts:58-74` (`getListAdvanced`)
- Test: `src/app/shared/services/data/paged-query.spec.ts`

This task changes the page shape from `T[]` to `{ items: T[]; extra: E[] }`. The existing `items$` behavior is unchanged; the spec's `dataset` helper must be wrapped so all existing tests still pass.

- [ ] **Step 1: Update the spec `dataset` helper and add the failing extras test**

In `src/app/shared/services/data/paged-query.spec.ts`, replace the `dataset` helper (lines 9-13) with the envelope form:

```ts
/** Builds a loadPage that slices fixed forwards/backwards datasets by skip/take, with empty extras. */
function dataset(forwards: number[], backwards: number[] = []) {
    return (dir: PageDirection, skip: number, take: number) =>
        of({ items: (dir === "forwards" ? forwards : backwards).slice(skip, skip + take), extra: [] as number[] });
}
```

Then add a new test (after the `dataset`-based tests):

```ts
it("accumulates per-page extras across forwards and backwards pages via extras$", async () => {
    const loadPage = (dir: PageDirection, skip: number, take: number) => {
        const arr = dir === "forwards" ? [10, 11, 12, 13] : [9, 8, 7, 6];
        const items = arr.slice(skip, skip + take);
        return of({ items, extra: items.map(n => `e${n}`) });
    };
    const pq = pagedQuery<number, string>(newClient(), { queryKey: ["p", "extras"], loadPage, pageSize: 2 });
    const extras: string[][] = [];
    pq.extras$.subscribe(e => extras.push(e));
    pq.items$.subscribe();
    await flush();
    expect(lastEmission(extras)).toEqual(["e10", "e11"]);

    pq.loadMore("backwards");
    await flush();
    // backwards page [9,8] (descending) is reversed → its extras ["e9","e8"] become ["e8","e9"], then the anchor's.
    expect(lastEmission(extras)).toEqual(["e8", "e9", "e10", "e11"]);
});
```

- [ ] **Step 2: Run tests to verify the new one fails**

Run: `npx ng test --include='**/paged-query.spec.ts' --watch=false`
Expected: FAIL — `extras$` does not exist on the returned object / type errors on the envelope `loadPage`.

- [ ] **Step 3: Add `extras$` to the contract**

In `src/app/shared/services/data/contracts.ts`, change the `PagedResult` interface to add the generic and `extras$`:

```ts
/** Result of a bidirectional, infinitely-scrolling list (the list view). E is an optional per-page sidecar (e.g. time-offs). */
export interface PagedResult<T, E = never> {
    items$: Observable<T[]>;
    /** Per-page sidecar values, accumulated across loaded pages in the same order as items$. */
    extras$: Observable<E[]>;
    /** True while a page is loading in either direction. */
    loading$: Observable<boolean>;
    /** True while the next (forwards) page is loading — for the bottom spinner. */
    loadingForwards$: Observable<boolean>;
    /** True while the previous (backwards) page is loading — for the top spinner. */
    loadingBackwards$: Observable<boolean>;
    error$: Observable<unknown>;
    loadMore(dir: PageDirection): void;
    hasMore(dir: PageDirection): boolean;
    refetch(): void;
}
```

- [ ] **Step 4: Generalize `paged-query.ts`**

Rewrite `src/app/shared/services/data/paged-query.ts` so a page is `{ items, extra }`. Apply these exact changes:

Replace the `PagedQueryOptions` interface (lines 27-34):

```ts
/** One raw page: its `items` drive pagination/flattening; `extra` is an optional sidecar accumulated into extras$. */
export interface Page<T, E> {
    items: T[];
    extra: E[];
}

export interface PagedQueryOptions<T, E> {
    /** TanStack cache key for this list (include the params/filter that scope it). */
    queryKey: CacheKey;
    /** Fetch one raw page. Forwards pages come back ascending; backwards pages descending (nearest-to-anchor first). */
    loadPage: (dir: PageDirection, skip: number, take: number) => Observable<Page<T, E>>;
    /** Items per page. Defaults to 20. */
    pageSize?: number;
}
```

Change the function signature and internals (lines 46 onward). The full replacement of the function body from `export function pagedQuery`:

```ts
export function pagedQuery<T, E = never>(client: QueryClient, opts: PagedQueryOptions<T, E>): PagedResult<T, E> {
    const pageSize = opts.pageSize ?? 20;

    /** Flatten a per-page field into one buffer. Backwards pages (negative index) arrive descending, so reverse them. */
    const flatten = <V>(pages: Page<T, E>[] | undefined, pageParams: PageParam[] | undefined, pick: (p: Page<T, E>) => V[]): V[] => {
        const data: V[] = [];
        if (pages == null || pageParams == null)
            return data;

        for (let i = 0; i < pages.length; i++) {
            const param = pageParams[i];
            const arr = pick(pages[i]);
            const ascending = param != null && param.index < 0 ? [...arr].reverse() : arr;
            data.push(...ascending);
        }
        return data;
    };

    type Result = InfiniteQueryObserverResult<InfiniteData<Page<T, E>, PageParam>, unknown>;
    let observer: InfiniteQueryObserver<Page<T, E>, unknown, InfiniteData<Page<T, E>, PageParam>, unknown[], PageParam> | null = null;
    let latest: Result | null = null;

    const result$ = new Observable<Result>(sub => {
        const o = new InfiniteQueryObserver<Page<T, E>, unknown, InfiniteData<Page<T, E>, PageParam>, unknown[], PageParam>(client, {
            queryKey: opts.queryKey as unknown[],
            queryFn: ({ pageParam }) => {
                const { dir, skip } = pageRequest(pageParam.index, pageSize);
                return firstValueFrom(opts.loadPage(dir, skip, pageSize));
            },
            initialPageParam: { index: 0 },
            getNextPageParam: (lastPage, _all, lastParam) => {
                if (lastParam.index < 0)
                    return { index: lastParam.index + 1 };
                return lastPage.items.length < pageSize ? undefined : { index: lastParam.index + 1 };
            },
            getPreviousPageParam: (firstPage, _all, firstParam) => {
                if (firstParam.index === 0)
                    return { index: -1 };
                return firstPage.items.length < pageSize ? undefined : { index: firstParam.index - 1 };
            },
        });
        observer = o;
        latest = o.getCurrentResult();
        sub.next(latest);
        const unsubscribe = o.subscribe(r => { latest = r; sub.next(r); });
        return () => {
            unsubscribe();
            o.destroy();
            if (observer === o) {
                observer = null;
                latest = null;
            }
        };
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));

    const view$ = result$.pipe(
        map(r => {
            return {
                items: flatten(r.data?.pages, r.data?.pageParams, p => p.items),
                extras: flatten(r.data?.pages, r.data?.pageParams, p => p.extra),
                error: r.error,
                loading: r.isPending,
                loadingForwards: r.isFetchingNextPage || (r.isFetching && r.isPending),
                loadingBackwards: r.isFetchingPreviousPage,
            };
        }),
        shareReplay({ bufferSize: 1, refCount: true }),
    );

    return {
        items$: view$.pipe(map(v => v.items)),
        extras$: view$.pipe(map(v => v.extras)),
        loading$: view$.pipe(map(v => v.loading), distinctUntilChanged()),
        loadingForwards$: view$.pipe(map(v => v.loadingForwards), distinctUntilChanged()),
        loadingBackwards$: view$.pipe(map(v => v.loadingBackwards), distinctUntilChanged()),
        error$: view$.pipe(map(v => v.error), distinctUntilChanged()),
        loadMore: (dir: PageDirection) => {
            if (!observer)
                return;
            const r = observer.getCurrentResult();
            if (r.isPending)
                return;
            if (r.isFetching && !r.isFetchingNextPage && !r.isFetchingPreviousPage)
                return;
            if (dir === "forwards") {
                if (r.isFetchingNextPage || !r.hasNextPage)
                    return;
                observer.fetchNextPage();
            } else {
                if (r.isFetchingPreviousPage || !r.hasPreviousPage)
                    return;
                observer.fetchPreviousPage();
            }
        },
        hasMore: (dir: PageDirection) => dir === "forwards" ? (latest?.hasNextPage ?? false) : (latest?.hasPreviousPage ?? false),
        refetch: () => { observer?.refetch(); },
    };
}
```

> Keep the existing `PageParam` interface, `pageRequest` helper, and the file's import block as-is. The long explanatory comments on `getNextPageParam`/`getPreviousPageParam`/`loadMore` from the original may be retained verbatim.

- [ ] **Step 5: Update `base-model-service.getListAdvanced`**

In `src/app/shared/services/base-model-service.ts`, replace the `getListAdvanced` method (lines 58-74) with:

```ts
public getListAdvanced<E = never>(
    queryKey: CacheKey,
    params: any,
    filter?: SmartFilter,
    mapPage?: (raw: any) => { items: vT[]; extra: E[] }): PagedResult<vT, E> {

    const mapFn = mapPage ?? ((raw: any[]) => ({ items: raw.map(o => new this.viewTypeFactory(o)), extra: [] as E[] }));

    let loadPage = (dir: "forwards" | "backwards", skip: number, take: number): Observable<{ items: vT[]; extra: E[] }> => {
        let p = {
            ...params,
            direction: dir,
            skip: skip,
            take: take
        };

        if (filter != null)
            p.filter = JSON.stringify(filter);

        return this.httpClient.get<any>(`${appConfig.apiUrl}${this.controllerName}/getList`, { params: p })
            .pipe(map(r => mapFn(r)));
    };

    return pagedQuery<vT, E>(this.queryClient, { queryKey, loadPage });
}
```

> The leading doc comment on `getListAdvanced` (lines 53-57) stays. `map` is the rxjs operator already imported in this file.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx ng test --include='**/paged-query.spec.ts' --watch=false`
Expected: PASS (all existing tests + the new extras test).

- [ ] **Step 7: Commit**

```bash
git add src/app/shared/services/data/contracts.ts src/app/shared/services/data/paged-query.ts src/app/shared/services/base-model-service.ts src/app/shared/services/data/paged-query.spec.ts
git commit -m "feat(data-seam): support a per-page extras sidecar in pagedQuery/PagedResult"
```

---

## Task 5: Frontend — `AppointmentService.getList` splits the envelope

**Files:**
- Modify: `src/app/pages/appointments/services/appointment.service.ts`

- [ ] **Step 1: Add the envelope type and update imports**

In `src/app/pages/appointments/services/appointment.service.ts`:
- Change the appointment-model import (line 9) to also bring in the view DTO (it already imports `AppointmentViewDTO`).
- Add: `import { TimeOffOccurrence, TimeOffOccurrenceDTO } from "src/app/models/time-off-occurrence";`
- Add this interface above the `@Injectable` decorator:

```ts
export interface AppointmentListPageDTO {
    appointments: AppointmentViewDTO[];
    timeOffs: TimeOffOccurrenceDTO[];
}
```

- [ ] **Step 2: Update `getList`**

Replace the `getList` method (lines 35-41) with:

```ts
public getList(date: Dayjs, filter: SmartFilter | undefined): PagedResult<AppointmentView, TimeOffOccurrence> {
    // Filter is part of the cache key so different filters cache as separate lists; the
    // serialized form must match what getListAdvanced sends as the `filter` HTTP param.
    return this.getListAdvanced<TimeOffOccurrence>(
        [...appointmentKeys.list(date.format("YYYY-MM-DD")), filter ? JSON.stringify(filter) : "all"],
        { date: date.format("YYYY-MM-DD") },
        filter,
        (raw: AppointmentListPageDTO) => ({
            items: raw.appointments.map(a => new AppointmentView(a)),
            extra: raw.timeOffs.map(o => new TimeOffOccurrence(o)),
        }));
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx ng build --configuration development`
Expected: build succeeds (the component still consumes `items$`; `extras$` not yet used — fine).

- [ ] **Step 4: Commit**

```bash
git add src/app/pages/appointments/services/appointment.service.ts
git commit -m "feat(appointments): map the list envelope into appointments + time-off extras"
```

---

## Task 6: Frontend — list component renders appointments + time-offs atomically

**Files:**
- Modify: `src/app/pages/appointments/components/appointments-list/appointments-list.component.ts`

- [ ] **Step 1: Update imports and the `pagedResult` field type**

In `appointments-list.component.ts`:
- In the rxjs import (line 6: `import { Subscription, filter } from 'rxjs';`), add `combineLatest`: `import { Subscription, filter, combineLatest } from 'rxjs';`
- Remove the `TimeOffService` import (`import { TimeOffService } from 'src/app/pages/time-off/services/time-off.service';`).
- Change the field `private pagedResult?: PagedResult<AppointmentView>;` to `private pagedResult?: PagedResult<AppointmentView, TimeOffOccurrence>;`

- [ ] **Step 2: Remove the `TimeOffService` constructor dependency**

In the constructor, remove the `private timeOffService: TimeOffService,` parameter (keep `changeDetector`, `appointmentService`, `router`).

- [ ] **Step 3: Replace the subscription wiring in `load()`**

In `load()`, replace the `items$` subscription block:

```ts
this.pagedSubs.push(this.pagedResult.items$.subscribe(a => {
  this.appointments = a;
  this.renderAppointments();
  // Re-fetch the time-off window whenever the appointment span grows (each page load
  // re-emits items$), so newly-revealed dates always have their occurrences available.
  this.loadTimeOffs();

  setTimeout(() => this.checkShouldLoad());
}));
```

with a single combined subscription:

```ts
// Appointments and their time-offs arrive in the same paged response (items$ + extras$ are
// projections of one query), so combine them and render once — no separate fetch, no pop-in.
this.pagedSubs.push(combineLatest([this.pagedResult.items$, this.pagedResult.extras$]).subscribe(([appointments, timeOffs]) => {
  this.appointments = appointments;
  this.timeOffs = this.dedupeOccurrences(timeOffs);
  this.renderAppointments();

  setTimeout(() => this.checkShouldLoad());
}));
```

- [ ] **Step 4: Replace `loadTimeOffs()` with `dedupeOccurrences()`**

Delete the entire `loadTimeOffs()` method and add in its place:

```ts
// A page-boundary date can appear at the tail of one page and the head of the next, so the same
// occurrence may arrive twice across pages. Dedupe by (rule id, date).
private dedupeOccurrences(occurrences: TimeOffOccurrence[]): TimeOffOccurrence[] {
  let seen = new Set<string>();
  let result: TimeOffOccurrence[] = [];
  for (let o of occurrences) {
    let key = `${o.id}|${o.date?.format("YYYY-MM-DD")}`;
    if (seen.has(key))
      continue;
    seen.add(key);
    result.push(o);
  }
  return result;
}
```

- [ ] **Step 5: Verify it compiles and unit tests pass**

Run: `npx ng build --configuration development`
Expected: build succeeds; no remaining references to `timeOffService` or `loadTimeOffs`.

Run: `npx ng test --include='**/appointments-list.component.spec.ts' --watch=false`
Expected: PASS, or "no spec found" (no spec exists). If a spec exists and references `TimeOffService`, update its `TestBed` providers to drop `TimeOffService` and provide a stub `AppointmentService.getList` returning a `PagedResult` whose `items$`/`extras$` are `of([])`.

- [ ] **Step 6: Commit**

```bash
git add src/app/pages/appointments/components/appointments-list/appointments-list.component.ts
git commit -m "feat(appointments): render list appointments and time-offs in one tick"
```

---

## Task 7: Frontend — time-off invalidation + remove dead `getForRange`

**Files:**
- Modify: `src/app/pages/time-off/services/time-off.service.ts`

- [ ] **Step 1: Add the appointment cross-entity invalidation key**

In `src/app/pages/time-off/services/time-off.service.ts`:
- Change the keys import to also import `appointmentKeys`:
  `import { appointmentKeys, timeOffKeys } from "src/app/shared/services/data/keys";`
- Change the `super(...)` call to pass `appointmentKeys.all` as the cross-entity key (time-offs now live in the appointment list response, so a time-off edit must refetch it):

```ts
super(injector, TimeOff.ENTITY_TYPE, TimeOff, TimeOff, timeOffKeys, [appointmentKeys.all]);
```

- [ ] **Step 2: Remove the dead `getForRange` method**

Delete the `getForRange` method from the service (the appointments list was its only consumer). Leave `getForDate` as-is.

- [ ] **Step 3: Verify it compiles**

Run: `npx ng build --configuration development`
Expected: build succeeds (no remaining `getForRange` callers).

- [ ] **Step 4: Commit**

```bash
git add src/app/pages/time-off/services/time-off.service.ts
git commit -m "feat(timeoff): invalidate appointment list on time-off change; drop unused getForRange"
```

---

## Task 8: Backend — remove the dead `GetForRange` endpoint

**Files:**
- Modify: `Appy/Controllers/TimeOffController.cs:69-75`

- [ ] **Step 1: Remove the endpoint**

In `Appy/Controllers/TimeOffController.cs`, delete the `getForRange` action (the `[HttpGet("getForRange")]` method). Keep `getForDate`. Keep `ITimeOffService.GetOccurrencesForRange` (now used by `AppointmentService`).

- [ ] **Step 2: Verify it builds and tests pass**

Run: `dotnet build`
Expected: build succeeds.

Run: `dotnet test`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add Appy/Controllers/TimeOffController.cs
git commit -m "chore(timeoff): remove unused getForRange endpoint"
```

---

## Task 9: Update CLAUDE.md docs

**Files:**
- Modify: `Appy/Appy-frontend/src/app/shared/CLAUDE.md`
- Modify: `Appy/Appy-frontend/src/app/pages/appointments/CLAUDE.md`
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md`
- Modify: `Appy/DTOs/CLAUDE.md`
- Modify: `Appy/Controllers/CLAUDE.md`

- [ ] **Step 1: Edit the docs**

Apply these concise edits:
- `shared/CLAUDE.md` (Data Seam section): note `PagedResult<T, E>` now exposes `extras$` (a per-page sidecar accumulated across pages); `pagedQuery` pages are `{ items, extra }`; `getListAdvanced(queryKey, params, filter?, mapPage?)` takes an optional `mapPage` to split a non-array page body (default maps a plain array with empty extras).
- `appointments/CLAUDE.md` (List view + `AppointmentService`): the list view's time-offs now arrive in the `getList` response (`extras$`), rendered atomically with appointments via `combineLatest` — there is no separate time-off fetch. Update the `AppointmentService.getList` line to mention it returns `PagedResult<AppointmentView, TimeOffOccurrence>`.
- `time-off/CLAUDE.md` (Service / Display elsewhere): the list view no longer calls `getForRange`; time-offs ride along the appointment list response. `getForDate` remains for `getForDate`/CalendarDay consumers.
- `DTOs/CLAUDE.md` (Time-off DTOs note): `TimeOffOccurrenceDTO` now carries `Id` (source rule id) for client-side dedupe; add `AppointmentListPageDTO` (appointments + that page's time-offs) as the list endpoint's response.
- `Controllers/CLAUDE.md` (Appointment-Specific Notes): `getList` returns `AppointmentListPageDTO` (appointments + the page's time-off occurrences). Remove `/timeoff/getForRange` from any endpoint mention if listed.

- [ ] **Step 2: Commit**

```bash
git add Appy/Appy-frontend/src/app/shared/CLAUDE.md Appy/Appy-frontend/src/app/pages/appointments/CLAUDE.md Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md Appy/DTOs/CLAUDE.md Appy/Controllers/CLAUDE.md
git commit -m "docs: update CLAUDE.md for combined list-view time-offs"
```

---

## Final verification

- [ ] **Backend:** `dotnet test` → all pass.
- [ ] **Frontend unit:** `npx ng test --watch=false` → all pass.
- [ ] **Build:** `npx ng build --configuration development` → succeeds.
- [ ] **Manual / E2E:** with backend + frontend running, open the list view and confirm appointments and time-offs appear together (no pop-in) on first load and when scrolling into new pages; edit a time-off and confirm the list reflects it. Run `npx cypress run` from `Appy/Appy-frontend/` (background).

---

## Self-review

**Spec coverage:** envelope DTO (T2) ✓; `Id` on occurrence (T1) ✓; `GetList` returns time-offs for page span (T2) ✓; controller return type (T2) ✓; seam `extras$` + envelope + `mapPage` (T4) ✓; `AppointmentService.getList` split (T5) ✓; component `combineLatest` + dedupe + drop `loadTimeOffs` (T6) ✓; `TimeOffService` invalidation + `getForRange` removal (T7) ✓; `TimeOffController.GetForRange` removal (T8) ✓; docs (T9) ✓; tests for seam/backend/model ✓.

**Placeholder scan:** none — every code step has concrete code; the one note (AppointmentViewDTO.Date name) is a verify-the-name caveat, not a missing implementation.

**Type consistency:** `Page<T,E> = { items, extra }`, `PagedResult<T,E>` with `extras$`, `getListAdvanced<E>(queryKey, params, filter?, mapPage?)`, `getList(): PagedResult<AppointmentView, TimeOffOccurrence>`, `dedupeOccurrences(TimeOffOccurrence[])`, occurrence key `${id}|${date}` — consistent across tasks.
