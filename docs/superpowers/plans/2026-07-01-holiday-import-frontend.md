# Holiday Import — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Depends on** the backend plan (`docs/superpowers/plans/2026-07-01-holiday-import-backend.md`) being implemented and running — this plan consumes the `/holiday/*` endpoints it adds.

**Goal:** Turn the stubbed Holidays tab into the real feature: configure a country, list imported holidays (with edited/removed treatment), open details (provenance + Changes + Revert/Restore), and edit/remove within limits — all by **extending existing time-off components**, adding only the configure dialog as new markup.

**Architecture:** A root `HolidayService` talks to `/holiday/*` and feeds the existing data seam (`pagedQuery`/`CacheCoordinator`). The Holidays tab in `TimeOffComponent` renders the list from `HolidayService` (removed holidays have no `TimeOff`, so it can't reuse the `TimeOff` list path). `app-single-time-off-list-item`, `app-single-time-off`, and `app-time-off-edit` each gain a holiday branch. Holiday display strings reuse the existing `time-off-display.ts` helpers by projecting a `Holiday` onto a transient one-off `TimeOff`. Mutations invalidate `holidayKeys.all` + `timeOffKeys.all` + `appointmentKeys.all` so the holiday list, time-off lists, and appointment views all refetch.

**Tech Stack:** Angular 16, RxJS, dayjs, TanStack-backed data seam, Karma/Jasmine (bare-instance unit tests, no TestBed), Cypress (page objects + `[data-test]` selectors).

## Global Constraints

- **Extend existing components; only the configure dialog is new markup** (lives inside `TimeOffComponent`).
- Holiday **names are already localized** by the backend (`Name` = provider `localName`); the frontend never translates a holiday name.
- **Removed** holiday = `isRemoved` (no linked `TimeOff`). Tapping it opens a **restore confirmation** — not the details view.
- **Edited** = `isEdited` (date or time differs from original). A note alone never marks a holiday edited.
- **Revert** (edited): resets date + time, keeps notes. **Restore** (removed): brings back the original.
- **Remove and Restore are confirmed** (dialog). Revert is confirmed too (it discards date/time edits).
- Holiday edit is constrained: **single date** (never multi-day), all-day toggle → time, notes. **Name is locked.**
- All holiday mutations invalidate `holidayKeys.all`, `timeOffKeys.all`, `appointmentKeys.all`.
- Two languages: add every new string key to **both** `en.json` and `hr.json` under `pages.time-off`.
- Unit tests: bare instances (`new Component(null as any, ...)`), `jasmine.createSpy().and.callFake(...)` for deps, `dayjs.extend(...)` plugins up top (the models validate on set). E2E: page objects only, `[data-test]` selectors, `POST /testing/seed` in `beforeEach` (already global).

---

### Task 1: `Holiday` model + cache keys

**Files:**
- Create: `Appy/Appy-frontend/src/app/models/holiday.ts`
- Modify: `Appy/Appy-frontend/src/app/shared/services/data/keys.ts`
- Test: `Appy/Appy-frontend/src/app/models/holiday.spec.ts`

**Interfaces:**
- Produces: `HolidayDTO`, `Holiday` (Dayjs-parsed), `HolidayImportSettings` + `HolidayImportSettingsDTO`, `SupportedCountry`, `HolidayEditRequest`; and `holidayKeys` in `keys.ts`.

- [ ] **Step 1: Write the failing test**

```typescript
// src/app/models/holiday.spec.ts
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Holiday, HolidayDTO } from "./holiday";

dayjs.extend(customParseFormat);

describe("Holiday model", () => {
  it("parses dates and times from the DTO", () => {
    const dto: HolidayDTO = {
      id: 5, name: "Nova godina", countryCode: "HR",
      date: "2026-04-13", originalDate: "2026-04-06",
      isAllDay: false, timeFrom: "12:00:00", timeTo: "17:00:00",
      notes: "note", isEdited: true, isRemoved: false,
    };

    const h = new Holiday(dto);

    expect(h.id).toBe(5);
    expect(h.name).toBe("Nova godina");
    expect(h.date!.format("YYYY-MM-DD")).toBe("2026-04-13");
    expect(h.originalDate!.format("YYYY-MM-DD")).toBe("2026-04-06");
    expect(h.timeFrom!.format("HH:mm")).toBe("12:00");
    expect(h.isEdited).toBe(true);
    expect(h.isRemoved).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run (from `Appy/Appy-frontend/`): `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=src/app/models/holiday.spec.ts`
Expected: FAIL — cannot find `./holiday`.

- [ ] **Step 3: Create the model**

```typescript
// src/app/models/holiday.ts
import dayjs, { Dayjs } from "dayjs";

export interface HolidayDTO {
  id: number;
  name: string;
  countryCode: string;
  date?: string;
  originalDate?: string;
  isAllDay: boolean;
  timeFrom?: string;
  timeTo?: string;
  notes?: string;
  isEdited: boolean;
  isRemoved: boolean;
}

export class Holiday {
  public id: number;
  public name: string;
  public countryCode: string;
  public date?: Dayjs;
  public originalDate?: Dayjs;
  public isAllDay: boolean;
  public timeFrom?: Dayjs;
  public timeTo?: Dayjs;
  public notes?: string;
  public isEdited: boolean;
  public isRemoved: boolean;

  constructor(dto: HolidayDTO) {
    this.id = dto.id;
    this.name = dto.name;
    this.countryCode = dto.countryCode;
    this.date = dto.date ? dayjs(dto.date, "YYYY-MM-DD") : undefined;
    this.originalDate = dto.originalDate ? dayjs(dto.originalDate, "YYYY-MM-DD") : undefined;
    this.isAllDay = dto.isAllDay;
    this.timeFrom = dto.timeFrom ? dayjs(dto.timeFrom, "HH:mm:ss") : undefined;
    this.timeTo = dto.timeTo ? dayjs(dto.timeTo, "HH:mm:ss") : undefined;
    this.notes = dto.notes;
    this.isEdited = dto.isEdited;
    this.isRemoved = dto.isRemoved;
  }
}

export interface SupportedCountry {
  countryCode: string;
  name: string;
}

export class HolidayImportSettingsDTO {
  public countryCode?: string;
}

export class HolidayImportSettings {
  public countryCode?: string;

  constructor(dto: HolidayImportSettingsDTO = new HolidayImportSettingsDTO()) {
    this.countryCode = dto.countryCode;
  }

  public getDTO(): HolidayImportSettingsDTO {
    return { countryCode: this.countryCode };
  }
}

// Body for PUT /holiday/edit/{id}.
export interface HolidayEditRequest {
  date: string;        // YYYY-MM-DD
  isAllDay: boolean;
  timeFrom?: string;   // HH:mm:ss
  timeTo?: string;     // HH:mm:ss
  notes?: string;
}
```

- [ ] **Step 4: Add cache keys**

In `src/app/shared/services/data/keys.ts`, next to `timeOffKeys`, add (plain `as const`, no `satisfies` — it carries extra `settings`/`countries` members):

```typescript
export const holidayKeys = {
    all: ["holiday"] as const,
    list: (scope: string) => ["holiday", "list", scope] as const,
    detail: (id: number) => ["holiday", "detail", id] as const,
    settings: ["holiday", "settings"] as const,
    countries: ["holiday", "countries"] as const,
};
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=src/app/models/holiday.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/models/holiday.ts src/app/models/holiday.spec.ts src/app/shared/services/data/keys.ts
git commit -m "feat(holiday): frontend Holiday model + cache keys"
```

---

### Task 2: `HolidayService`

**Files:**
- Create: `Appy/Appy-frontend/src/app/pages/time-off/services/holiday.service.ts`
- Test: `Appy/Appy-frontend/src/app/pages/time-off/services/holiday.service.spec.ts`

**Interfaces:**
- Produces: `HolidayService` (root-provided) with:
  - `getList(scope: TimeOffScope): PagedResult<Holiday, never>`
  - `getById(id: number): Observable<Holiday>`
  - `getSettings(): Observable<HolidayImportSettings>`
  - `saveSettings(settings: HolidayImportSettings): Observable<HolidayImportSettings>`
  - `getSupportedCountries(): Observable<SupportedCountry[]>`
  - `edit(id: number, req: HolidayEditRequest): Observable<void>`
  - `remove(id: number): Observable<void>`, `revert(id): Observable<void>`, `restore(id): Observable<void>`
- Consumes: `pagedQuery`, `query`, `CacheCoordinator`, `QueryClient` (data seam); `holidayKeys`, `timeOffKeys`, `appointmentKeys`.

- [ ] **Step 1: Write the failing test (mutations invalidate the right keys)**

The codebase tests service logic with spies rather than `HttpTestingController`. Assert the invalidation contract, which is the important behavior.

```typescript
// src/app/pages/time-off/services/holiday.service.spec.ts
import { of } from "rxjs";
import { HolidayService } from "./holiday.service";
import { appointmentKeys, holidayKeys, timeOffKeys } from "src/app/shared/services/data/keys";

describe("HolidayService — cache invalidation", () => {
  function make() {
    const http = { put: jasmine.createSpy("put").and.returnValue(of(null)) };
    const cache = { invalidate: jasmine.createSpy("invalidate") };
    // Bypass the DI constructor: build a bare instance and inject the collaborators the mutations use.
    const svc = Object.create(HolidayService.prototype) as any;
    svc.httpClient = http;
    svc.cache = cache;
    return { svc, http, cache };
  }

  it("remove() invalidates holiday, time-off and appointment keys", (done) => {
    const { svc, cache } = make();
    svc.remove(7).subscribe(() => {
      expect(cache.invalidate).toHaveBeenCalledWith(holidayKeys.all, timeOffKeys.all, appointmentKeys.all);
      done();
    });
  });

  it("revert() and restore() invalidate the same keys", (done) => {
    const { svc, cache } = make();
    svc.revert(7).subscribe(() => {
      svc.restore(7).subscribe(() => {
        expect(cache.invalidate).toHaveBeenCalledTimes(2);
        done();
      });
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=src/app/pages/time-off/services/holiday.service.spec.ts`
Expected: FAIL — cannot find `./holiday.service`.

- [ ] **Step 3: Implement the service**

```typescript
// src/app/pages/time-off/services/holiday.service.ts
import { Injectable, Injector } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { QueryClient } from "@tanstack/query-core";
import { map, Observable } from "rxjs";
import { appConfig } from "src/app/app.config";
import { TimeOffScope } from "src/app/models/time-off";
import {
  Holiday, HolidayDTO, HolidayEditRequest, HolidayImportSettings, HolidayImportSettingsDTO, SupportedCountry,
} from "src/app/models/holiday";
import { CacheCoordinator, CacheKey } from "src/app/shared/services/data/cache-coordinator";
import { PagedResult, QueryResult } from "src/app/shared/services/data/contracts";
import { query } from "src/app/shared/services/data/query";
import { pagedQuery } from "src/app/shared/services/data/paged-query";
import { appointmentKeys, holidayKeys, timeOffKeys } from "src/app/shared/services/data/keys";

@Injectable({ providedIn: "root" })
export class HolidayService {
  private readonly controllerName = "holiday";
  private readonly mutationKeys: CacheKey[] = [holidayKeys.all, timeOffKeys.all, appointmentKeys.all];

  private httpClient: HttpClient;
  private queryClient: QueryClient;
  private cache: CacheCoordinator;

  constructor(injector: Injector) {
    this.httpClient = injector.get(HttpClient);
    this.queryClient = injector.get(QueryClient);
    this.cache = injector.get(CacheCoordinator);
  }

  public getList(scope: TimeOffScope): PagedResult<Holiday, never> {
    return pagedQuery<Holiday, never>(this.queryClient, {
      queryKey: [...holidayKeys.list(scope)],
      loadPage: (direction, skip, take) =>
        this.httpClient.get<HolidayDTO[]>(`${appConfig.apiUrl}${this.controllerName}/getList`, {
          params: { scope, skip, take, direction },
        }).pipe(map(r => ({ items: r.map(d => new Holiday(d)), extra: [] as never[] }))),
    });
  }

  public getById(id: number): Observable<Holiday> {
    return this.httpClient.get<HolidayDTO>(`${appConfig.apiUrl}${this.controllerName}/get/${id}`)
      .pipe(map(d => new Holiday(d)));
  }

  public getSettings(): Observable<HolidayImportSettings> {
    return this.httpClient.get<HolidayImportSettingsDTO>(`${appConfig.apiUrl}${this.controllerName}/settings`)
      .pipe(map(dto => new HolidayImportSettings(dto)));
  }

  public saveSettings(settings: HolidayImportSettings): Observable<HolidayImportSettings> {
    return this.httpClient.put<HolidayImportSettingsDTO>(`${appConfig.apiUrl}${this.controllerName}/settings`, settings.getDTO())
      .pipe(map(dto => {
        this.cache.invalidate(...this.mutationKeys);
        return new HolidayImportSettings(dto);
      }));
  }

  public getSupportedCountries(): QueryResult<SupportedCountry[]> {
    return query(this.queryClient, [...holidayKeys.countries], () =>
      this.httpClient.get<SupportedCountry[]>(`${appConfig.apiUrl}${this.controllerName}/getSupportedCountries`));
  }

  public edit(id: number, req: HolidayEditRequest): Observable<void> {
    return this.mutate("put", `edit/${id}`, req);
  }

  public remove(id: number): Observable<void> { return this.mutate("put", `remove/${id}`, null); }
  public revert(id: number): Observable<void> { return this.mutate("put", `revert/${id}`, null); }
  public restore(id: number): Observable<void> { return this.mutate("put", `restore/${id}`, null); }

  private mutate(method: "put", path: string, body: any): Observable<void> {
    return this.httpClient.put<void>(`${appConfig.apiUrl}${this.controllerName}/${path}`, body)
      .pipe(map(() => { this.cache.invalidate(...this.mutationKeys); }));
  }
}
```

> `getSupportedCountries()` returns a cached `QueryResult` (the country list is static-ish); the spec calls `remove/revert/restore` which use the `httpClient`/`cache` fields directly, matching the bare-instance test.

- [ ] **Step 4: Run to verify passing**

Run: `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=src/app/pages/time-off/services/holiday.service.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/pages/time-off/services/holiday.service.ts src/app/pages/time-off/services/holiday.service.spec.ts
git commit -m "feat(holiday): HolidayService (list/get/settings/countries/edit/remove/revert/restore)"
```

---

### Task 3: List item — render a `Holiday` with badge + removed treatment

**Files:**
- Modify: `.../components/single-time-off-list-item/single-time-off-list-item.component.ts`
- Modify: `.../components/single-time-off-list-item/single-time-off-list-item.component.html`
- Modify: `.../components/single-time-off-list-item/single-time-off-list-item.component.scss`
- Test: `.../components/single-time-off-list-item/single-time-off-list-item.component.spec.ts`

**Interfaces:**
- Produces: `SingleTimeOffListItemComponent` gains `@Input() holiday?: Holiday`. When set, it renders from the holiday (badge `Edited`/`Removed`, dim + strike + grey accent for removed) and still emits `onOpenView`.
- Consumes: `timeOffScheduleText` / `timeOffTimeText` (existing) via a transient one-off `TimeOff` projection.

- [ ] **Step 1: Write the failing test**

```typescript
// single-time-off-list-item.component.spec.ts
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Holiday } from "src/app/models/holiday";
import { SingleTimeOffListItemComponent } from "./single-time-off-list-item.component";

dayjs.extend(customParseFormat);

function makeItem(): SingleTimeOffListItemComponent {
  // Only TranslateService is used, and only for text formatting; a pass-through identity is enough.
  return new SingleTimeOffListItemComponent({ translate: (k: string) => k, getSelectedLanguageCode: () => "en" } as any);
}

describe("SingleTimeOffListItemComponent — holiday mode", () => {
  it("shows the edited badge for an edited holiday", () => {
    const c = makeItem();
    c.holiday = new Holiday({ id: 1, name: "Easter Monday", countryCode: "HR", date: "2026-04-13", originalDate: "2026-04-06", isAllDay: true, isEdited: true, isRemoved: false });
    expect(c.label).toBe("Easter Monday");
    expect(c.badge).toBe("edited");
    expect(c.removed).toBe(false);
  });

  it("marks a removed holiday", () => {
    const c = makeItem();
    c.holiday = new Holiday({ id: 2, name: "Labour Day", countryCode: "HR", date: "2026-05-01", originalDate: "2026-05-01", isAllDay: true, isEdited: false, isRemoved: true });
    expect(c.badge).toBe("removed");
    expect(c.removed).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=**/single-time-off-list-item.component.spec.ts`
Expected: FAIL — `holiday`/`badge`/`removed` don't exist.

- [ ] **Step 3: Extend the component**

Add to `SingleTimeOffListItemComponent` (keep the existing `timeOff` input/`render()` untouched):

```typescript
  // holiday-mode inputs/state (list rows on the Holidays tab)
  public badge: "none" | "edited" | "removed" = "none";
  public removed: boolean = false;

  private _holiday?: Holiday;
  @Input() set holiday(value: Holiday | undefined) {
    this._holiday = value;
    this.renderHoliday();
  }
  get holiday(): Holiday | undefined { return this._holiday; }

  private renderHoliday(): void {
    const h = this._holiday;
    if (h == null) return;
    // Project the holiday onto a transient one-off TimeOff so the existing display helpers apply.
    const proj = new TimeOff();
    proj.recurrence = TimeOffRecurrence.OneOff;
    proj.startDate = h.date;
    proj.endDate = h.date;
    proj.isAllDay = h.isAllDay;
    proj.timeFrom = h.timeFrom;
    proj.timeTo = h.timeTo;

    const tr = (k: string) => this.translateService.translate(k);
    this.label = h.name;
    this.schedule = timeOffScheduleText(proj, tr, this.translateService.getSelectedLanguageCode());
    this.dateRange = "";
    this.time = timeOffTimeText(proj, tr);
    this.removed = h.isRemoved;
    this.badge = h.isRemoved ? "removed" : (h.isEdited ? "edited" : "none");
  }
```

Add the imports at the top: `import { Holiday } from "src/app/models/holiday";` and extend the existing `time-off` import to `import { TimeOff, TimeOffRecurrence } from "src/app/models/time-off";`.

- [ ] **Step 4: Extend the template**

In `single-time-off-list-item.component.html`, add the badge next to the label and state classes on the row (keep the existing structure):

```html
<div class="time-off-row" [class.removed]="removed" (click)="onOpenView.emit()" data-test="time-off-row">
  <div class="accent" [class.accent-removed]="removed"></div>
  <div class="info">
    <div class="label">
      <span [class.struck]="removed">{{ label }}</span>
      <span *ngIf="badge === 'edited'" class="badge badge-edited" data-test="holiday-badge-edited">{{ "pages.time-off.EDITED" | translate }}</span>
      <span *ngIf="badge === 'removed'" class="badge badge-removed" data-test="holiday-badge-removed">{{ "pages.time-off.REMOVED" | translate }}</span>
    </div>
    <div class="meta">
      <div class="meta-primary">
        <span class="schedule">{{ schedule }}</span>
        <span class="time">{{ time }}</span>
      </div>
      <span class="date-range" *ngIf="dateRange">{{ dateRange }}</span>
    </div>
  </div>
  <fa-icon class="type-icon" [icon]="['fas', 'umbrella-beach']" aria-hidden="true"></fa-icon>
</div>
```

- [ ] **Step 5: Add styles**

Append to `single-time-off-list-item.component.scss`:

```scss
.time-off-row.removed { opacity: 0.55; }
.accent.accent-removed { background: rgb(var(--rgb-text-tertiary)); }
.struck { text-decoration: line-through; }
.badge {
  font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;
  padding: 2px 7px; border-radius: 100px; margin-left: 6px;
}
.badge-edited { background: rgba(var(--rgb-warning), 0.2); color: rgb(var(--rgb-warning)); }
.badge-removed { background: rgb(var(--rgb-input-background)); color: rgb(var(--rgb-text-tertiary)); }
```

> Confirm the CSS custom-property names against `src/styles/` (e.g. `--rgb-warning`, `--rgb-text-tertiary`, `--rgb-input-background`); adjust to the actual theme tokens if they differ.

- [ ] **Step 6: Run to verify passing**

Run: `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=**/single-time-off-list-item.component.spec.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/pages/time-off/components/single-time-off-list-item/
git commit -m "feat(holiday): list item renders holiday with edited/removed treatment"
```

---

### Task 4: Container — Holidays list, empty state, configure dialog

**Files:**
- Modify: `.../components/time-off/time-off.component.ts`
- Modify: `.../components/time-off/time-off.component.html`
- Modify: `.../components/time-off/time-off.component.scss`
- Test: `.../components/time-off/time-off.component.spec.ts` (create)

**Interfaces:**
- Consumes: `HolidayService` (Task 2), `Holiday`/`HolidayImportSettings`/`SupportedCountry` (Task 1), `SingleTimeOffListItemComponent` (Task 3, holiday input), `SingleTimeOffComponent` (Task 5, holiday input), `DialogComponent`, `app-dropdown`.
- Produces: the wired Holidays tab. `configureAutoImport()` opens the configure dialog; the empty-state CTA opens the same dialog.

- [ ] **Step 1: Replace the stub + wire holiday state in the component**

Add to `TimeOffComponent` (inject `HolidayService`, keep existing tab/scope logic):

```typescript
  // Holidays tab state
  public holidays: Holiday[] = [];
  public holidaysLoading: boolean = false;
  public viewingHoliday?: Holiday;

  // Configure dialog state
  public settings?: HolidayImportSettings;
  public countries: SupportedCountry[] = [];
  public selectedCountryCode?: string;
  public savingSettings: boolean = false;

  @ViewChild("configureDialog") configureDialog?: DialogComponent;
  @ViewChild("confirmChangeDialog") confirmChangeDialog?: DialogComponent;

  // ...in the queryParamMap subscription, when the Holidays tab/scope is active, (re)load:
  private loadHolidaysIfNeeded(): void {
    if (!this.isHolidays) return;
    this.holidaysLoading = true;
    this.holidaySub?.unsubscribe();
    const paged = this.holidayService.getList(this.scope);
    this.holidaySub = paged.items$.subscribe(items => { this.holidays = items; });
    paged.loading$.subscribe(l => this.holidaysLoading = l);
    // (Active is a bounded set; wire loadMore on scroll only if you keep the History scope paging —
    //  mirror TimeOffListComponent.checkShouldLoad if desired.)
  }
```

Add the dropdown display function and the configure/save handlers:

```typescript
  public countryDisplay = (c: SupportedCountry): string => c?.name ?? "";

  public configureAutoImport(): void {
    this.holidayService.getSettings().subscribe(s => {
      this.settings = s;
      this.selectedCountryCode = s.countryCode;
      this.holidayService.getSupportedCountries().data$.subscribe(cs => this.countries = cs ?? []);
      this.configureDialog?.open();
    });
  }

  public get selectedCountry(): SupportedCountry | undefined {
    return this.countries.find(c => c.countryCode === this.selectedCountryCode);
  }

  public confirmConfigure(): void {
    // Warn before a change/clear that would discard future edits/removals.
    const changing = this.selectedCountryCode !== this.settings?.countryCode;
    const hasImported = this.holidays.length > 0;
    if (changing && hasImported && this.settings?.countryCode != null) {
      this.configureDialog?.close();
      this.confirmChangeDialog?.open();
      return;
    }
    this.saveSettings();
  }

  public saveSettings(): void {
    this.savingSettings = true;
    const settings = new HolidayImportSettings({ countryCode: this.selectedCountryCode });
    this.holidayService.saveSettings(settings).subscribe({
      next: () => { this.savingSettings = false; this.configureDialog?.close(); this.confirmChangeDialog?.close(); this.loadHolidaysIfNeeded(); },
      error: () => { this.savingSettings = false; },
    });
  }
```

Add imports and a `holidaySub?: Subscription`. Call `loadHolidaysIfNeeded()` from the `queryParamMap` subscription (after `activeTab`/`scope` are set) and unsubscribe `holidaySub` in `ngOnDestroy`.

- [ ] **Step 2: Replace the Holidays stub markup**

In `time-off.component.html`, replace the `holidays-stub` block with the list + empty state, and add the details/configure dialogs:

```html
  <!-- Holidays tab -->
  <ng-container *ngIf="isHolidays">
    <app-loading *ngIf="holidaysLoading"></app-loading>

    <div *ngIf="!holidaysLoading && holidays.length === 0" class="holidays-empty" data-test="holidays-empty">
      <fa-icon [icon]="['fas', 'umbrella-beach']" aria-hidden="true"></fa-icon>
      <div>{{ "pages.time-off.HOLIDAYS_EMPTY" | translate }}</div>
      <app-button color="success" look="solid" [text]="'pages.time-off.HOLIDAYS_CONFIGURE_CTA' | translate"
        (onClick)="configureAutoImport()" data-test="holidays-configure-cta"></app-button>
    </div>

    <app-single-time-off-list-item *ngFor="let h of holidays" [holiday]="h"
      (onOpenView)="viewingHoliday = h; holidayDetailsDialog.open()">
    </app-single-time-off-list-item>
  </ng-container>

<app-dialog #holidayDetailsDialog>
  <app-single-time-off *ngIf="holidayDetailsDialog.isOpen" [holiday]="viewingHoliday"
    (onChanged)="loadHolidaysIfNeeded()" (onDone)="holidayDetailsDialog.close()"></app-single-time-off>
</app-dialog>

<app-dialog #configureDialog>
  <div class="configure-dialog" *ngIf="configureDialog.isOpen" data-test="holiday-configure-dialog">
    <div class="configure-title">{{ "pages.time-off.CONFIGURE_AUTO_IMPORT" | translate }}</div>
    <div class="configure-sub">{{ "pages.time-off.CONFIGURE_SUB" | translate }}</div>

    <div class="w-input-container">
      <label class="w-label">{{ "pages.time-off.COUNTRY" | translate }}</label>
      <app-dropdown [items]="countries" [displayFunction]="countryDisplay" [fullWidth]="true" [matchTriggerWidth]="true"
        [value]="selectedCountry" (valueChange)="selectedCountryCode = $event?.countryCode"
        data-test="holiday-country-dropdown"></app-dropdown>
    </div>

    <div class="configure-actions">
      <app-button [text]="'CANCEL' | translate" color="danger" look="normal" (onClick)="configureDialog.close()"></app-button>
      <app-button [text]="'pages.time-off.IMPORT' | translate" color="success" look="solid"
        [disabled]="savingSettings" [isLoading]="savingSettings" (onClick)="confirmConfigure()"
        data-test="holiday-configure-save"></app-button>
    </div>
  </div>
</app-dialog>

<app-dialog #confirmChangeDialog>
  <div class="configure-dialog" *ngIf="confirmChangeDialog.isOpen" data-test="holiday-change-confirm-dialog">
    <div class="split-hint">
      <fa-icon [icon]="['fas', 'circle-info']" aria-hidden="true"></fa-icon>
      <span>{{ "pages.time-off.CHANGE_COUNTRY_WARNING" | translate }}</span>
    </div>
    <div class="configure-actions">
      <app-button [text]="'CANCEL' | translate" color="danger" look="normal" (onClick)="confirmChangeDialog.close()"></app-button>
      <app-button [text]="'CONFIRM' | translate" color="danger" look="solid" [disabled]="savingSettings"
        (onClick)="saveSettings()" data-test="holiday-change-confirm"></app-button>
    </div>
  </div>
</app-dialog>
```

- [ ] **Step 2b: Styles**

Append minimal styles to `time-off.component.scss` for `.holidays-empty` (centered umbrella + text + button) and `.configure-dialog`/`.configure-actions` (mirror the editor's `.split-dialog`/`.split-actions`). Reuse the existing empty-state look from `time-off-list.component.scss`.

- [ ] **Step 3: Write a component test (configure-change warning gate)**

```typescript
// time-off.component.spec.ts
import { TimeOffComponent } from "./time-off.component";
import { Holiday } from "src/app/models/holiday";
import { HolidayImportSettings } from "src/app/models/holiday";

function make(): TimeOffComponent {
  return new TimeOffComponent(null as any, null as any, null as any, null as any);
}

describe("TimeOffComponent — configure change gate", () => {
  it("opens the confirm dialog when changing an existing country with imported holidays present", () => {
    const c = make();
    (c as any).settings = new HolidayImportSettings({ countryCode: "HR" });
    c.selectedCountryCode = "SI";
    c.holidays = [new Holiday({ id: 1, name: "x", countryCode: "HR", isAllDay: true, isEdited: false, isRemoved: false })];
    const configure = { close: jasmine.createSpy("close") };
    const confirm = { open: jasmine.createSpy("open") };
    (c as any).configureDialog = configure; (c as any).confirmChangeDialog = confirm;
    const saveSpy = spyOn(c, "saveSettings");

    c.confirmConfigure();

    expect(confirm.open).toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("saves directly when there is nothing to lose (no prior country)", () => {
    const c = make();
    (c as any).settings = new HolidayImportSettings({ countryCode: undefined });
    c.selectedCountryCode = "HR";
    c.holidays = [];
    const saveSpy = spyOn(c, "saveSettings");

    c.confirmConfigure();

    expect(saveSpy).toHaveBeenCalled();
  });
});
```

> The constructor arg count must match `TimeOffComponent`'s (Router, Location, ActivatedRoute, + injected `HolidayService`). Pass `null as any` for each; add the `HolidayService` parameter to the constructor when wiring Step 1.

- [ ] **Step 4: Run tests**

Run: `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=**/time-off.component.spec.ts`
Expected: PASS.

- [ ] **Step 5: Build + commit**

Run: `npx ng build`
Expected: builds. Then:

```bash
git add src/app/pages/time-off/components/time-off/
git commit -m "feat(holiday): Holidays tab list, empty state, configure dialog"
```

---

### Task 5: Details view — holiday treatment (provenance, Changes, Revert/Restore)

**Files:**
- Modify: `.../components/single-time-off/single-time-off.component.ts`
- Modify: `.../components/single-time-off/single-time-off.component.html`
- Modify: `.../components/single-time-off/single-time-off.component.scss`
- Test: `.../components/single-time-off/single-time-off.component.spec.ts` (create)

**Interfaces:**
- Produces: `SingleTimeOffComponent` gains `@Input() holiday?: Holiday` and `@Output() onChanged` (fires after revert/restore/remove so the container refetches). Renders provenance, current values, a "Changed from original" block (edited), Revert (edited) / Restore (removed) with confirmation, Edit (→ `/time-off/holiday/edit/:id`), Remove (with confirmation). Existing `id` (TimeOff) path is unchanged except: if the loaded TimeOff has `importedHolidayId != null`, it fetches the holiday via `HolidayService.getById` and shows the same treatment (covers the appointments-view reuse).
- Consumes: `HolidayService`, `Holiday`, `DialogComponent`.

- [ ] **Step 1: Write the failing test (revert flow + change fields)**

```typescript
// single-time-off.component.spec.ts
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { of } from "rxjs";
import { Holiday } from "src/app/models/holiday";
import { SingleTimeOffComponent } from "./single-time-off.component";

dayjs.extend(customParseFormat);

function make(holidayService: any) {
  // (timeOffService, translateService, router, holidayService)
  return new SingleTimeOffComponent(null as any, { translate: (k: string) => k, getSelectedLanguageCode: () => "en" } as any, null as any, holidayService);
}

describe("SingleTimeOffComponent — holiday mode", () => {
  it("computes the Changes rows for an edited holiday", () => {
    const c = make({});
    c.holiday = new Holiday({ id: 1, name: "Easter Monday", countryCode: "HR", date: "2026-04-13", originalDate: "2026-04-06", isAllDay: false, timeFrom: "12:00:00", timeTo: "17:00:00", isEdited: true, isRemoved: false });
    expect(c.isHolidayEdited).toBe(true);
    expect(c.changedDate).toBe(true);   // 13 Apr vs 06 Apr
    expect(c.changedTime).toBe(true);   // timed vs all-day
  });

  it("reverts and emits onChanged", (done) => {
    const revert = jasmine.createSpy("revert").and.returnValue(of(undefined));
    const c = make({ revert });
    c.holiday = new Holiday({ id: 9, name: "x", countryCode: "HR", date: "2026-04-13", originalDate: "2026-04-06", isAllDay: true, isEdited: true, isRemoved: false });
    (c as any).revertDialog = { close: () => {} };
    c.onChanged.subscribe(() => { expect(revert).toHaveBeenCalledWith(9); done(); });

    c.confirmRevert();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=**/single-time-off.component.spec.ts`
Expected: FAIL.

- [ ] **Step 3: Extend the component**

Add to `SingleTimeOffComponent` (constructor gains `private holidayService: HolidayService`):

```typescript
  @Output() onChanged: EventEmitter<void> = new EventEmitter();

  public holidayModel?: Holiday;
  public isHolidayEdited = false;
  public isHolidayRemoved = false;
  public changedDate = false;
  public changedTime = false;

  @ViewChild("revertDialog") revertDialog?: DialogComponent;
  @ViewChild("removeDialog") removeDialog?: DialogComponent;
  @ViewChild("restoreDialog") restoreDialog?: DialogComponent;

  private _holiday?: Holiday;
  @Input() set holiday(value: Holiday | undefined) {
    this._holiday = value;
    if (value != null) this.applyHoliday(value);
  }
  get holiday(): Holiday | undefined { return this._holiday; }

  private applyHoliday(h: Holiday): void {
    this.holidayModel = h;
    this.isHolidayRemoved = h.isRemoved;
    this.isHolidayEdited = h.isEdited;
    this.changedDate = h.date != null && h.originalDate != null && !h.date.isSame(h.originalDate, "date");
    this.changedTime = !h.isAllDay;
    // schedule/time text: reuse helpers via a transient one-off TimeOff (same projection as the list item).
    const proj = new TimeOff();
    proj.recurrence = TimeOffRecurrence.OneOff;
    proj.startDate = h.date; proj.endDate = h.date; proj.isAllDay = h.isAllDay;
    proj.timeFrom = h.timeFrom; proj.timeTo = h.timeTo;
    const tr = (k: string) => this.translateService.translate(k);
    this.schedule = timeOffScheduleText(proj, tr, this.translateService.getSelectedLanguageCode());
    this.time = timeOffTimeText(proj, tr);
  }

  public goToEditHoliday(): void {
    if (this._holiday == null) return;
    this.router.navigate(["time-off", "holiday", "edit", this._holiday.id]);
    this.onDone.next();
  }

  public confirmRevert(): void {
    if (this._holiday == null) return;
    this.holidayService.revert(this._holiday.id).subscribe(() => { this.revertDialog?.close(); this.onChanged.next(); this.onDone.next(); });
  }
  public confirmRemove(): void {
    if (this._holiday == null) return;
    this.holidayService.remove(this._holiday.id).subscribe(() => { this.removeDialog?.close(); this.onChanged.next(); this.onDone.next(); });
  }
  public confirmRestore(): void {
    if (this._holiday == null) return;
    this.holidayService.restore(this._holiday.id).subscribe(() => { this.restoreDialog?.close(); this.onChanged.next(); this.onDone.next(); });
  }
```

In the existing `setDatasource(id)` success handler (TimeOff path), after `this.timeOff = t;` add the appointments-view bridge:

```typescript
      if (t.importedHolidayId != null) {
        this.holidayService.getById(t.importedHolidayId).subscribe(h => this.applyHoliday(h));
      }
```

(Add `importedHolidayId?: number` to the frontend `TimeOff`/`TimeOffDTO` model — mirror the backend DTO field — and map it in the constructor/`getDTO()` of `models/time-off.ts`.)

- [ ] **Step 4: Extend the template**

Wrap holiday treatment in `*ngIf="holidayModel"` (falls back to the existing time-off rendering when not a holiday). Add the provenance line, the Changes block, action buttons, and the three confirm dialogs. Example additions:

```html
<div *ngIf="holidayModel" class="holiday-details" data-test="holiday-details">
  <div class="header">
    <fa-icon [icon]="['fas', 'umbrella-beach']" aria-hidden="true"></fa-icon>
    <div class="title">{{ holidayModel.name }}</div>
    <span *ngIf="isHolidayRemoved" class="badge badge-removed">{{ "pages.time-off.REMOVED" | translate }}</span>
    <span *ngIf="isHolidayEdited" class="badge badge-edited">{{ "pages.time-off.EDITED" | translate }}</span>
  </div>
  <div class="provenance">{{ "pages.time-off.PUBLIC_HOLIDAY" | translate }} · {{ holidayModel.countryCode }}</div>

  <div *ngIf="isHolidayRemoved" class="removed-banner" data-test="holiday-removed-banner">
    <span>{{ "pages.time-off.REMOVED_HOLIDAY_INFO" | translate }}</span>
    <app-button [text]="'pages.time-off.RESTORE' | translate" icon="rotate-left" (onClick)="restoreDialog.open()" data-test="holiday-restore"></app-button>
  </div>

  <ng-container *ngIf="!isHolidayRemoved">
    <div class="info-card">
      <div class="info-row"><fa-icon icon="calendar-days" [fixedWidth]="true"></fa-icon><div>{{ schedule }}</div></div>
      <div class="info-row"><fa-icon icon="clock" [fixedWidth]="true"></fa-icon><div>{{ time }}</div></div>
    </div>
    <div class="notes" *ngIf="holidayModel.notes"><div class="notes-title">{{ "pages.time-off.NOTES" | translate }}</div><div class="notes-body">{{ holidayModel.notes }}</div></div>

    <div *ngIf="isHolidayEdited" class="changes-block" data-test="holiday-changes">
      <div class="changes-title">{{ "pages.time-off.CHANGED_FROM_ORIGINAL" | translate }}</div>
      <div class="changes-row" *ngIf="changedDate">
        <span class="changes-key">{{ "pages.time-off.DATE" | translate }}</span>
        <span class="changes-old">{{ holidayModel.originalDate?.format("DD.MM.YYYY") }}</span> →
        <span>{{ holidayModel.date?.format("DD.MM.YYYY") }}</span>
      </div>
      <div class="changes-row" *ngIf="changedTime">
        <span class="changes-key">{{ "pages.time-off.TIME" | translate }}</span>
        <span class="changes-old">{{ "pages.time-off.ALL_DAY" | translate }}</span> → <span>{{ time }}</span>
      </div>
      <app-button class="revert-btn" look="transparent" icon="rotate-left"
        [text]="'pages.time-off.REVERT_TO_ORIGINAL' | translate" (onClick)="revertDialog.open()" data-test="holiday-revert"></app-button>
    </div>

    <div class="action-bar">
      <app-button [text]="'pages.time-off.REMOVE' | translate" icon="trash" color="danger" (onClick)="removeDialog.open()" data-test="holiday-remove"></app-button>
      <app-button [text]="'EDIT' | translate" icon="pen" (onClick)="goToEditHoliday()" data-test="holiday-edit"></app-button>
    </div>
  </ng-container>
</div>

<app-dialog #revertDialog>
  <div class="split-dialog" *ngIf="revertDialog.isOpen" data-test="holiday-revert-dialog">
    <div class="split-hint"><fa-icon [icon]="['fas','circle-info']"></fa-icon><span>{{ "pages.time-off.REVERT_CONFIRM" | translate }}</span></div>
    <div class="split-actions">
      <app-button [text]="'CANCEL' | translate" color="danger" look="normal" (onClick)="revertDialog.close()"></app-button>
      <app-button [text]="'CONFIRM' | translate" color="success" look="solid" (onClick)="confirmRevert()" data-test="holiday-revert-confirm"></app-button>
    </div>
  </div>
</app-dialog>
<!-- #removeDialog and #restoreDialog: same shape, calling confirmRemove()/confirmRestore(), with REMOVE_CONFIRM / RESTORE_CONFIRM copy and data-test holiday-remove-confirm / holiday-restore-confirm -->
```

Add the two remaining dialogs (`#removeDialog`, `#restoreDialog`) following the `#revertDialog` shape. Add styles for `.provenance`, `.changes-block`, `.removed-banner`, `.badge*` (reuse the list-item badge styles).

- [ ] **Step 5: Run tests + commit**

Run: `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=**/single-time-off.component.spec.ts`
Expected: PASS.

```bash
git add src/app/pages/time-off/components/single-time-off/ src/app/models/time-off.ts
git commit -m "feat(holiday): details view treatment + revert/restore/remove"
```

---

### Task 6: Editor — holiday mode

**Files:**
- Modify: `.../components/time-off-edit/time-off-edit.component.ts`
- Modify: `.../components/time-off-edit/time-off-edit.component.html`
- Modify: `.../time-off-routing.module.ts` (add `holiday/edit/:id`)
- Test: `.../components/time-off-edit/time-off-edit.component.spec.ts` (add cases)

**Interfaces:**
- Consumes: `HolidayService.getById` / `.edit` / `.remove` (Task 2). Route `time-off/holiday/edit/:id` (id = `ImportedHoliday.Id`).
- Produces: holiday-mode editing — loads the holiday, projects it onto the existing one-off `TimeOff` form (reusing the date selector, all-day toggle, time dropdowns, notes), locks the label, hides recurrence + the apply-from/split dialog, saves via `HolidayService.edit`, and removes via `HolidayService.remove` (plain confirm).

- [ ] **Step 1: Add the route**

In `time-off-routing.module.ts`:

```typescript
  { path: "holiday/edit/:id", component: TimeOffEditComponent },
```

- [ ] **Step 2: Write the failing test**

```typescript
// add to time-off-edit.component.spec.ts
import { of } from "rxjs";

describe("TimeOffEditComponent — holiday mode", () => {
  it("saves via HolidayService.edit with a single-day date and time", () => {
    const holidayService = { edit: jasmine.createSpy("edit").and.returnValue(of(undefined)) };
    // (timeOffService, route, location, translateService, holidayService)
    const c = new TimeOffEditComponent(null as any, null as any, { back: () => {} } as any, null as any, holidayService as any);
    c.isHolidayMode = true;
    c.holidayId = 42;
    c.isNew = false;
    c.timeOff.recurrence = TimeOffRecurrence.OneOff;
    c.timeOff.startDate = dayjs("2026-04-13");
    c.timeOff.endDate = dayjs("2026-04-13");
    c.timeOff.isAllDay = false;
    c.timeOff.timeFrom = dayjs({ hour: 12 });
    c.timeOff.timeTo = dayjs({ hour: 17 });
    c.timeOff.label = "Easter Monday";

    c.save();

    expect(holidayService.edit).toHaveBeenCalledWith(42, jasmine.objectContaining({ date: "2026-04-13", isAllDay: false, timeFrom: "12:00:00", timeTo: "17:00:00" }));
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=**/time-off-edit.component.spec.ts`
Expected: FAIL.

- [ ] **Step 4: Add holiday mode to the component**

Constructor gains `private holidayService: HolidayService`. Add:

```typescript
  public isHolidayMode = false;
  public holidayId?: number;

  // in ngOnInit, detect the holiday route BEFORE the existing id/new logic:
  //   const holidayId = this.route.snapshot.paramMap.get("id") when the path is holiday/edit/:id
  // Use the route config path to distinguish; simplest: a data flag or check the URL.
  private initHolidayMode(): void {
    this.isHolidayMode = true;
    this.isNew = false;
    this.type = "oneoff";
    const id = +this.route.snapshot.paramMap.get("id")!;
    this.holidayId = id;
    this.holidayService.getById(id).subscribe(h => {
      const t = new TimeOff();
      t.recurrence = TimeOffRecurrence.OneOff;
      t.label = h.name;              // locked
      t.startDate = h.date; t.endDate = h.date;
      t.isAllDay = h.isAllDay;
      t.timeFrom = h.timeFrom ?? dayjs({ hour: 9 });
      t.timeTo = h.timeTo ?? dayjs({ hour: 17 });
      t.notes = h.notes;
      this.timeOff = t;
      this.originalStartDate = t.startDate;
      this.isLoaded = true;
    });
  }
```

Wire `initHolidayMode()` in `ngOnInit`: detect the holiday route via `this.route.snapshot.url` (the `holiday` segment) or an added route `data: { holiday: true }`. Prefer route `data`:

```typescript
  { path: "holiday/edit/:id", component: TimeOffEditComponent, data: { holiday: true } },
```

then in `ngOnInit`: `if (this.route.snapshot.data["holiday"]) { this.initHolidayMode(); return; }` before the existing logic.

Branch `save()` and `delete()` at the top:

```typescript
  // in save():
  if (this.isHolidayMode) {
    if (!this.timeOff.validate()) return;
    this.isLoading = true;
    this.holidayService.edit(this.holidayId!, {
      date: this.timeOff.startDate!.format("YYYY-MM-DD"),
      isAllDay: this.timeOff.isAllDay,
      timeFrom: this.timeOff.isAllDay ? undefined : this.timeOff.timeFrom?.format("HH:mm:ss"),
      timeTo: this.timeOff.isAllDay ? undefined : this.timeOff.timeTo?.format("HH:mm:ss"),
      notes: this.timeOff.notes,
    }).subscribe({ next: () => this.goBack(), error: () => this.isLoading = false });
    return;
  }

  // in delete():
  if (this.isHolidayMode) { this.canStop = false; this.deleteMode = "remove"; this.deleteDialog?.open(); return; }

  // in confirmDelete():
  if (this.isHolidayMode) { this.deleteDialog?.close(); this.isLoading = true; this.holidayService.remove(this.holidayId!).subscribe({ next: () => this.goBack(), error: () => this.isLoading = false }); return; }
```

- [ ] **Step 5: Template — lock label, hide recurrence, single date**

In `time-off-edit.component.html`, gate holiday-specific rendering on `isHolidayMode`:
- The **Label** input: when `isHolidayMode`, render read-only (show the name as static text, or `[readonly]="isHolidayMode"` on the input).
- The **When** section: when `isHolidayMode`, show only the single **Date** selector (bind to `timeOff.startDate` via `onStartDateChange`, which already drags `endDate` for single-day) — hide the recurring controls and the To-date/day-count. Wrap the existing `type === 'oneoff'` To-date block so it's hidden in holiday mode (holidays are always single-day; `onStartDateChange` keeps `endDate` in lockstep).
- The **split dialog** (`#splitDialog`) never fires in holiday mode (guarded by `isHolidayMode` early-returns in `save()`), so no template change needed; the **delete dialog** shows a plain confirm (`canStop=false`).
- Title: show `timeOff.label` (the locked holiday name) when `isHolidayMode`.

- [ ] **Step 6: Run tests + build + commit**

Run: `npx ng test --no-watch --browsers=ChromeHeadlessCI --include=**/time-off-edit.component.spec.ts`
Expected: PASS.
Run: `npx ng build`
Expected: builds.

```bash
git add src/app/pages/time-off/components/time-off-edit/ src/app/pages/time-off/time-off-routing.module.ts
git commit -m "feat(holiday): editor holiday mode (locked name, single date, edit/remove)"
```

---

### Task 7: Translations

**Files:**
- Modify: `Appy/Appy-frontend/src/assets/translations/en.json`
- Modify: `Appy/Appy-frontend/src/assets/translations/hr.json`

- [ ] **Step 1: Add keys under `pages.time-off` in both files**

`en.json` (add these; `CONFIGURE_AUTO_IMPORT` already exists — leave it):

```json
"EDITED": "Edited",
"REMOVED": "Removed",
"HOLIDAYS_EMPTY": "No holidays imported",
"HOLIDAYS_CONFIGURE_CTA": "Configure",
"CONFIGURE_SUB": "Public holidays for the chosen country are added as time-off and kept up to date each year.",
"COUNTRY": "Country",
"IMPORT": "Import",
"CHANGE_COUNTRY_WARNING": "Changing the country removes your upcoming imported holidays and any changes to them. Past holidays stay as history.",
"PUBLIC_HOLIDAY": "Public holiday",
"CHANGED_FROM_ORIGINAL": "Changed from original",
"DATE": "Date",
"REVERT_TO_ORIGINAL": "Revert to original",
"REVERT_CONFIRM": "This resets the date and time to the original holiday. Your note is kept.",
"REMOVE": "Remove",
"REMOVE_CONFIRM": "Remove this holiday? It won't block bookings. You can restore it later.",
"RESTORE": "Restore",
"RESTORE_CONFIRM": "Restore this holiday to its original date and time?",
"REMOVED_HOLIDAY_INFO": "You removed this holiday. It won't block bookings."
```

`hr.json` (Croatian):

```json
"EDITED": "Uređeno",
"REMOVED": "Uklonjeno",
"HOLIDAYS_EMPTY": "Nema uvezenih praznika",
"HOLIDAYS_CONFIGURE_CTA": "Postavi",
"CONFIGURE_SUB": "Državni praznici odabrane zemlje dodaju se kao odsutnost i ažuriraju svake godine.",
"COUNTRY": "Država",
"IMPORT": "Uvezi",
"CHANGE_COUNTRY_WARNING": "Promjena države uklanja nadolazeće uvezene praznike i njihove izmjene. Prošli praznici ostaju u povijesti.",
"PUBLIC_HOLIDAY": "Državni praznik",
"CHANGED_FROM_ORIGINAL": "Izmijenjeno u odnosu na izvornik",
"DATE": "Datum",
"REVERT_TO_ORIGINAL": "Vrati na izvorno",
"REVERT_CONFIRM": "Ovo vraća datum i vrijeme na izvorni praznik. Bilješka se zadržava.",
"REMOVE": "Ukloni",
"REMOVE_CONFIRM": "Ukloniti ovaj praznik? Neće blokirati termine. Možete ga kasnije vratiti.",
"RESTORE": "Vrati",
"RESTORE_CONFIRM": "Vratiti ovaj praznik na izvorni datum i vrijeme?",
"REMOVED_HOLIDAY_INFO": "Uklonili ste ovaj praznik. Neće blokirati termine."
```

- [ ] **Step 2: Build to confirm JSON is valid**

Run: `npx ng build`
Expected: builds (no JSON parse errors).

- [ ] **Step 3: Commit**

```bash
git add src/assets/translations/en.json src/assets/translations/hr.json
git commit -m "feat(holiday): en/hr translations for the holidays UI"
```

---

### Task 8: Cypress E2E

**Files:**
- Modify: `Appy/Appy-frontend/cypress/e2e/pages/time-off.ts` (page-object additions)
- Create: `Appy/Appy-frontend/cypress/e2e/holidays.cy.ts`

**Interfaces:**
- Consumes the `[data-test]` hooks added in Tasks 3–6 (`holidays-configure-cta`, `holiday-configure-dialog`, `holiday-country-dropdown`, `holiday-configure-save`, `time-off-row`, `holiday-badge-edited`, `holiday-badge-removed`, `holiday-details`, `holiday-remove`, `holiday-restore`, `holiday-revert`, and the `*-confirm` buttons).

> **Architecture (required):** These E2E tests MUST follow the architecture of the existing E2E tests exactly (see `cypress/e2e/time-off.cy.ts`, `cypress/e2e/pages/time-off.ts`, `cypress/support/commands.ts`, and `cypress/CLAUDE.md`):
> - **Page objects only** — specs never call `cy.*` on app elements directly; every selector lives in a page object under `cypress/e2e/pages/`.
> - **`[data-test]` selection** via the `getElement(...)` helper — never CSS classes or IDs.
> - Reuse the existing custom commands (`login(...)`, `expectURL`) and the global `POST /testing/seed` reset in `beforeEach` — do not add a parallel auth/seeding mechanism.
> - Reuse the shared lookup helpers (`toggleSwitch`, `dateLookup`, etc.) rather than re-implementing widget interactions.
> - Keep the fluent, chained page-object style (`page.action().subAction().expect()`).
> If any interaction needs a selector that doesn't exist yet, add a `[data-test]` attribute to the component (Tasks 3–6) and a page-object method — never reach into the DOM from the spec.

> **Network note:** these flows configure **Croatia** and assert on fixed-date holidays (e.g. New Year's Day, 01.01), which the live Nager.Date API returns deterministically. The E2E env already runs a live backend with internet. If CI network flakiness appears, the fallback is to seed a couple of `ImportedHoliday` rows + linked `TimeOff`s in the `TestingService` seeder and assert against those instead.

- [ ] **Step 1: Extend the time-off page object**

Add to `cypress/e2e/pages/time-off.ts`:

```typescript
export let holidays = {
  openTab() { timeOff.visit(); getElement("time-off-tab-Holidays").click(); return this; },
  configure() { getElement("time-off-configure-import").click(); return holidayConfigure; },
  configureViaEmptyState() { getElement("holidays-configure-cta").click(); return holidayConfigure; },
  expectRow(text: string) { getElement("time-off-list").parent().should("contain", text); return this; },
  expectRowContains(text: string) { cy.get("[data-test=time-off-row]").should("contain", text); return this; },
  openRow(text: string) { cy.get("[data-test=time-off-row]").contains(text).click(); return holidayDetails; },
};

export let holidayConfigure = {
  expectVisible() { getElement("holiday-configure-dialog").should("exist"); return this; },
  selectCountry(name: string) { getElement("holiday-country-dropdown").find(".my-button").click(); cy.contains(name).click(); return this; },
  import() { getElement("holiday-configure-save").click(); return this; },
};

export let holidayDetails = {
  expectVisible() { getElement("holiday-details").should("exist"); return this; },
  expectChanges() { getElement("holiday-changes").should("exist"); return this; },
  revert() { getElement("holiday-revert").click(); getElement("holiday-revert-confirm").click(); return this; },
  remove() { getElement("holiday-remove").click(); getElement("holiday-remove-confirm").click(); return this; },
  restore() { getElement("holiday-restore").click(); getElement("holiday-restore-confirm").click(); return this; },
  edit() { getElement("holiday-edit").click(); return timeOffEdit; },
};
```

(Import `getElement`, `timeOff`, `timeOffEdit` as the other page objects in this file do.)

- [ ] **Step 2: Write the E2E spec**

```typescript
// cypress/e2e/holidays.cy.ts
import { login } from "../support/commands";
import { holidays, holidayConfigure } from "./pages/time-off";

describe("Holidays", () => {
  beforeEach(() => login("appointments"));

  it("imports a country's holidays and lists them", () => {
    holidays.openTab().configureViaEmptyState();
    holidayConfigure.expectVisible().selectCountry("Croatia").import();

    holidays.openTab();
    holidays.expectRowContains("Nova godina"); // New Year's Day (01.01), deterministic
  });

  it("edits a holiday's time, shows the Changes block, then reverts", () => {
    holidays.openTab().configureViaEmptyState();
    holidayConfigure.selectCountry("Croatia").import();

    holidays.openTab();
    const details = holidays.openRow("Nova godina");
    details.edit().toggleAllDay().save();

    holidays.openTab();
    const d2 = holidays.openRow("Nova godina");
    d2.expectVisible().expectChanges();
    d2.revert();
  });

  it("removes a holiday then restores it", () => {
    holidays.openTab().configureViaEmptyState();
    holidayConfigure.selectCountry("Croatia").import();

    holidays.openTab();
    holidays.openRow("Nova godina").remove();

    holidays.openTab();
    holidays.openRow("Nova godina").restore();
  });
});
```

- [ ] **Step 3: Run E2E**

Ensure backend (`dotnet run --project Appy`) and frontend (`npx ng serve`) are running. From `Appy/Appy-frontend/`:

Run (background): `npx cypress run --spec cypress/e2e/holidays.cy.ts`
Expected: all specs pass.

- [ ] **Step 4: Commit**

```bash
git add cypress/e2e/pages/time-off.ts cypress/e2e/holidays.cy.ts
git commit -m "test(holiday): Cypress E2E for import, edit/revert, remove/restore"
```

---

### Task 9: Update CLAUDE.md docs

**Files:**
- Modify: `Appy/Appy-frontend/src/app/pages/time-off/CLAUDE.md`
- Modify: `Appy/Appy-frontend/src/app/models/CLAUDE.md`
- Modify: `Appy/CLAUDE.md` (child map — add HolidayController/HolidayService if the map lists them) and `Appy/Domain/CLAUDE.md` (entity table)

- [ ] **Step 1: Document the feature**

Update the Time Off page CLAUDE.md: the Holidays tab is now functional — lists `Holiday`s from `HolidayService` (removed holidays have no `TimeOff`), the gear/empty-state opens the configure dialog, details show provenance + Changes + Revert/Restore, the editor has a holiday mode, and imported holidays materialize as one-off `TimeOff`s linked via `TimeOff.ImportedHolidayId`. Add `Holiday`/`HolidayImportSettings` to the models CLAUDE.md and `ImportedHoliday`/`HolidayImportSettings` to `Domain/CLAUDE.md`'s entity table.

- [ ] **Step 2: Commit**

```bash
git add -A "**/CLAUDE.md"
git commit -m "docs(holiday): update CLAUDE.md for the holidays feature"
```

---

## Self-Review

**Spec coverage:**
- Configure country + preview + turn-off → Task 4 (dialog) + Task 2 (`saveSettings`/`getSupportedCountries`). ✓
- List with Upcoming/History, badges, removed dim/strike/grey accent → Tasks 3, 4. ✓
- Details: provenance, Changes block, Revert (keeps notes), Restore, Edit, Remove → Task 5. ✓
- Editor: locked name, single date, all-day/time, notes, Remove → Task 6. ✓
- Removed tapping → restore confirmation (not the details view for a removed row is opened, but details renders the removed banner + Restore) → Task 5. ✓ *(Note: the row opens the details dialog which, for a removed holiday, shows only the removed banner + Restore — functionally the restore confirmation. If you prefer the row to open the confirm dialog directly, move the Restore confirm into the container; flagged for the reviewer.)*
- Change-country warning → Task 4 (`confirmConfigure` gate). ✓
- Appointments-view reuse (imported TimeOff shows holiday treatment) → Task 5 (`importedHolidayId` bridge). ✓
- Invalidation across holiday/time-off/appointment lists → Task 2. ✓
- en/hr strings → Task 7. ✓
- E2E → Task 8. ✓

**Placeholder scan:** Template steps (Tasks 4–6) intentionally show the *added* blocks with explicit placement rather than repasting entire 200-line templates; all logic/code an engineer types is concrete. The one open reviewer choice (removed-row → details-with-banner vs a direct confirm dialog) is flagged above, not left as a TODO.

**Type consistency:** `Holiday`/`HolidayDTO`/`HolidayImportSettings`/`HolidayEditRequest`/`SupportedCountry` (Task 1) are used identically in the service (Task 2) and components (Tasks 3–6). `holidayKeys` and the `HolidayService` method names match across tasks. `TimeOff.importedHolidayId` is added to the frontend model in Task 5 and consumed there.

## Out of scope

Backend (`docs/superpowers/plans/2026-07-01-holiday-import-backend.md`). Subdivision/region selection remains deferred per the spec. Infinite-scroll paging for the History holiday scope is optional (Active is a bounded set); wire it by mirroring `TimeOffListComponent.checkShouldLoad` if desired.
