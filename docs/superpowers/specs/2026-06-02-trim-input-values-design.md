# Trim Input Values (Sanitize via Trimming) — Design

**Issue:** [#37](https://github.com/Worly/Appy/issues/37) — *Sanitize all values by trimming them (except password)*
**Date:** 2026-06-02
**Scope:** Backend only (ASP.NET Core API boundary)

## Problem

User-submitted string values can arrive with leading/trailing whitespace (e.g. `"  John  "`, a pasted Instagram token with a trailing newline). These should be trimmed so stored and compared values are clean. The one exception is **passwords**, where whitespace is significant and must be preserved.

## Decision

Trim every string in JSON **request bodies** at the deserialization layer, with an explicit per-property opt-out for passwords. This is a single choke point (`System.Text.Json` deserialization configured in `Program.cs`), is hard to bypass, handles nested objects and collections for free, and requires no per-DTO changes beyond annotating password fields.

The frontend is **not** in scope: the backend is the source of truth and returns already-trimmed values on the round-trip. (Considered and rejected: frontend-only is bypassable by direct API calls; both is more surface area than the issue warrants.)

## Approach (chosen)

Global `JsonConverter<string>` + per-property opt-out.

Considered alternatives:
- **`TypeInfoResolver` modifier + marker attribute** — more .NET 8 machinery for the same result. Overkill.
- **Action filter / middleware reflecting over the bound model** — reflection-heavy, must hand-handle nesting/collections, slower, easy to miss cases. Rejected.

## Components

1. **`Appy/Utils/TrimmingStringConverter.cs`** — `JsonConverter<string>`.
   - `Read`: `reader.GetString()?.Trim()` (null-safe; trims to `string?`).
   - `Write`: passthrough (`writer.WriteStringValue(value)`).
   - Registered globally, so it fires for every string token during deserialization.

2. **`Appy/Utils/NoTrimStringConverter.cs`** — `JsonConverter<string>`.
   - Plain `reader.GetString()` / `writer.WriteStringValue(value)`, **no trimming**.
   - Exists solely so password properties can opt out of the global trimming. A property-level `[JsonConverter(...)]` attribute overrides the globally-registered converter.
   - Name mirrors `TrimmingStringConverter` so the opt-out reads unambiguously: `[JsonConverter(typeof(NoTrimStringConverter))]`.

3. **`Program.cs`** — register the global converter in the existing `AddJsonOptions` block:
   ```csharp
   .AddJsonOptions(opts =>
   {
       opts.UseDateOnlyTimeOnlyStringConverters();
       opts.JsonSerializerOptions.Converters.Add(new TrimmingStringConverter());
   });
   ```

4. **Password opt-out** — annotate the two password properties:
   - `Appy/DTOs/LogInDTO.cs` → `LogInDTO.Password`
   - `Appy/DTOs/RegisterDTO.cs` → `RegisterDTO.Password`

   ```csharp
   [JsonConverter(typeof(NoTrimStringConverter))]
   public string Password { get; set; }
   ```

## Behavior

| Input | Output |
|-------|--------|
| `"  John  "` | `"John"` |
| `"   "` (whitespace only) | `""` |
| `null` | `null` |
| Password `"  s3cr3t  "` | `"  s3cr3t  "` (unchanged) |
| Nested DTO strings (`AppointmentEditDTO.Client.Name`, `Contacts[].Value`) | trimmed automatically |

- Responses are unaffected (write is passthrough); stored values are already clean.

## Scope boundary

- **In scope:** JSON request bodies (all `[FromBody]` DTOs and their nested objects/lists).
- **Out of scope:** query-string parameters (`filter`, `languageCode`, `skip`, `take`, etc.). These are structured/enum/id values, not free-text user input. The global converter does not touch them by design.

## Testing (TDD — pure unit tests, no DB/HTTP)

Deserialize JSON through a `JsonSerializerOptions` configured with `TrimmingStringConverter`, mirroring the production registration, and assert:

1. **Top-level trimming** — `RegisterDTO` with `"  a@b.com  "`, `"  Jane  "`, `"  Doe  "` → all trimmed.
2. **Password preserved** — `RegisterDTO.Password` and `LogInDTO.Password` with surrounding spaces → unchanged (verifies the `NoTrimStringConverter` opt-out).
3. **Nested + collection trimming** — `AppointmentEditDTO` → `Client.Name` and `Contacts[].Value` trimmed.
4. **`null` preserved** — a nullable string field (`ClientDTO.Notes` / `Surname`) sent as `null` stays `null`.
5. **Whitespace-only → empty** — `"   "` becomes `""`.

Tests live under `Appy.Tests/` (new file, e.g. `Utils/TrimmingStringConverterTests.cs`), following the existing xUnit pattern.

## Docs to update

- `Appy/DTOs/CLAUDE.md` — note that request-body strings are trimmed on deserialization and that password fields opt out via `[JsonConverter(typeof(NoTrimStringConverter))]`.
- `Appy/Utils/CLAUDE.md` — document the two converters.

## Out of scope / non-goals

- Frontend trimming.
- Trimming query-string parameters.
- Any validation beyond whitespace trimming (no length/format rules added here).
