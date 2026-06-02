# Trim Input Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trim leading/trailing whitespace from every string in JSON request bodies at the API boundary, while preserving whitespace in password fields.

**Architecture:** A globally-registered `System.Text.Json` `JsonConverter<string>` (`TrimmingStringConverter`) trims every string during deserialization — covering nested objects and collections for free. Password properties opt out with a property-level `[JsonConverter(typeof(NoTrimStringConverter))]`, which overrides the global converter.

**Tech Stack:** ASP.NET Core 8, System.Text.Json, xUnit (`Appy.Tests`).

---

## File Structure

| File | Responsibility |
|------|----------------|
| `Appy/Utils/TrimmingStringConverter.cs` | **Create.** Global converter — trims string on read, passthrough on write. |
| `Appy/Utils/NoTrimStringConverter.cs` | **Create.** Passthrough converter (no trim) — opt-out for password fields. |
| `Appy/DTOs/RegisterDTO.cs` | **Modify.** Annotate `Password` with `[JsonConverter(typeof(NoTrimStringConverter))]`. |
| `Appy/DTOs/LogInDTO.cs` | **Modify.** Annotate `Password` with `[JsonConverter(typeof(NoTrimStringConverter))]`. |
| `Appy/Program.cs` | **Modify.** Register `TrimmingStringConverter` in the `AddJsonOptions` block. |
| `Appy.Tests/Utils/TrimmingStringConverterTests.cs` | **Create.** Unit tests for trimming + password opt-out. |
| `Appy/Utils/CLAUDE.md` | **Modify.** Document the two converters. |
| `Appy/DTOs/CLAUDE.md` | **Modify.** Document request-body trimming + password opt-out. |

Notes for the implementer:
- Both projects have `<Nullable>enable</Nullable>` and `<ImplicitUsings>enable</ImplicitUsings>`. `System.Text.Json` namespaces are **not** in implicit usings — add them explicitly.
- `JsonConverter<T>.Read` returns `T?` in .NET 8, so the override returns `string?`.
- A `null` JSON token never reaches a converter's `Read` by default (`HandleNull` is false), so `null` is preserved automatically — but keep the null-safe `?.` anyway.
- `Appy.Tests` references `Appy.csproj`, so `using Appy.DTOs;` and `using Appy.Utils;` work in tests.
- Existing tests use plain xUnit `Assert` (see `Appy.Tests/Services/ClientNotificationServiceTests.cs`). Match that style.

---

## Task 1: TrimmingStringConverter (trim on deserialize)

**Files:**
- Create: `Appy/Utils/TrimmingStringConverter.cs`
- Test: `Appy.Tests/Utils/TrimmingStringConverterTests.cs`

This task covers the core trimming behavior using `ClientDTO`, which has a non-null string (`Name`), nullable strings (`Surname`, `Notes`), and a nested collection (`Contacts` → `ClientContactDTO.Value`) — so one deserialization exercises top-level trim, null preservation, whitespace-only-to-empty, and nested/collection trimming.

- [ ] **Step 1: Write the failing test**

Create `Appy.Tests/Utils/TrimmingStringConverterTests.cs`:

```csharp
using System.Text.Json;
using Appy.DTOs;
using Appy.Utils;

namespace Appy.Tests.Utils
{
    public class TrimmingStringConverterTests
    {
        private static JsonSerializerOptions OptionsWithTrimming()
        {
            var options = new JsonSerializerOptions();
            options.Converters.Add(new TrimmingStringConverter());
            return options;
        }

        [Fact]
        public void Deserialize_TrimsStrings_AcrossTopLevelNestedAndCollections()
        {
            var json = """
            {
                "name": "  Jane  ",
                "surname": null,
                "notes": "   ",
                "contacts": [ { "type": 0, "value": "  +123  " } ]
            }
            """;

            var dto = JsonSerializer.Deserialize<ClientDTO>(json, OptionsWithTrimming());

            Assert.NotNull(dto);
            Assert.Equal("Jane", dto!.Name);          // top-level trimmed
            Assert.Null(dto.Surname);                  // null preserved
            Assert.Equal("", dto.Notes);               // whitespace-only -> empty
            Assert.Equal("+123", dto.Contacts[0].Value); // nested collection trimmed
        }
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test --filter "FullyQualifiedName~TrimmingStringConverterTests"`
Expected: FAIL — compile error, `TrimmingStringConverter` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `Appy/Utils/TrimmingStringConverter.cs`:

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Appy.Utils
{
    /// <summary>
    /// Globally-registered converter that trims leading/trailing whitespace from
    /// every string read from a JSON request body. Opt a property out with
    /// [JsonConverter(typeof(NoTrimStringConverter))] (e.g. password fields).
    /// </summary>
    public class TrimmingStringConverter : JsonConverter<string>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            => reader.GetString()?.Trim();

        public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
            => writer.WriteStringValue(value);
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotnet test --filter "FullyQualifiedName~TrimmingStringConverterTests"`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add Appy/Utils/TrimmingStringConverter.cs Appy.Tests/Utils/TrimmingStringConverterTests.cs
git commit -m "feat(sanitize): add TrimmingStringConverter to trim JSON string input (#37)"
```

---

## Task 2: NoTrimStringConverter + password opt-out

**Files:**
- Create: `Appy/Utils/NoTrimStringConverter.cs`
- Modify: `Appy/DTOs/RegisterDTO.cs`
- Modify: `Appy/DTOs/LogInDTO.cs`
- Test: `Appy.Tests/Utils/TrimmingStringConverterTests.cs` (add cases)

- [ ] **Step 1: Write the failing test**

Add these two tests inside the existing `TrimmingStringConverterTests` class:

```csharp
        [Fact]
        public void Deserialize_TrimsAllFields_ButPreservesRegisterPassword()
        {
            var json = """
            {
                "email": "  a@b.com  ",
                "name": "  Jane  ",
                "surname": "  Doe  ",
                "password": "  s3cr3t  "
            }
            """;

            var dto = JsonSerializer.Deserialize<RegisterDTO>(json, OptionsWithTrimming());

            Assert.NotNull(dto);
            Assert.Equal("a@b.com", dto!.Email);
            Assert.Equal("Jane", dto.Name);
            Assert.Equal("Doe", dto.Surname);
            Assert.Equal("  s3cr3t  ", dto.Password); // password NOT trimmed
        }

        [Fact]
        public void Deserialize_TrimsEmail_ButPreservesLogInPassword()
        {
            var json = """
            {
                "email": "  a@b.com  ",
                "password": "  pw  "
            }
            """;

            var dto = JsonSerializer.Deserialize<LogInDTO>(json, OptionsWithTrimming());

            Assert.NotNull(dto);
            Assert.Equal("a@b.com", dto!.Email);
            Assert.Equal("  pw  ", dto.Password); // password NOT trimmed
        }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test --filter "FullyQualifiedName~TrimmingStringConverterTests"`
Expected: FAIL — assertion failure. The password field is still trimmed by the global converter (e.g. expected `"  s3cr3t  "` but got `"s3cr3t"`), because the opt-out converter and attributes don't exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `Appy/Utils/NoTrimStringConverter.cs`:

```csharp
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Appy.Utils
{
    /// <summary>
    /// Pass-through string converter (no trimming). Apply via
    /// [JsonConverter(typeof(NoTrimStringConverter))] to opt a property out of the
    /// globally-registered <see cref="TrimmingStringConverter"/> — used for
    /// passwords, where surrounding whitespace is significant.
    /// </summary>
    public class NoTrimStringConverter : JsonConverter<string>
    {
        public override string? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
            => reader.GetString();

        public override void Write(Utf8JsonWriter writer, string value, JsonSerializerOptions options)
            => writer.WriteStringValue(value);
    }
}
```

Modify `Appy/DTOs/RegisterDTO.cs` to read exactly:

```csharp
using System.Text.Json.Serialization;
using Appy.Utils;

namespace Appy.DTOs
{
    public class RegisterDTO
    {
        public string Email { get; set; }
        public string Name { get; set; }
        public string Surname { get; set; }

        [JsonConverter(typeof(NoTrimStringConverter))]
        public string Password { get; set; }
    }
}
```

Modify `Appy/DTOs/LogInDTO.cs` to read exactly:

```csharp
using System.Text.Json.Serialization;
using Appy.Utils;

namespace Appy.DTOs
{
    public class LogInDTO
    {
        public string Email { get; set; }

        [JsonConverter(typeof(NoTrimStringConverter))]
        public string Password { get; set; }
    }

    public class LogInResponseDTO
    {
        public string AccessToken { get; set; }
        public string RefreshToken { get; set; }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotnet test --filter "FullyQualifiedName~TrimmingStringConverterTests"`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add Appy/Utils/NoTrimStringConverter.cs Appy/DTOs/RegisterDTO.cs Appy/DTOs/LogInDTO.cs Appy.Tests/Utils/TrimmingStringConverterTests.cs
git commit -m "feat(sanitize): opt password fields out of input trimming (#37)"
```

---

## Task 3: Register the converter globally + docs

**Files:**
- Modify: `Appy/Program.cs:40-42`
- Modify: `Appy/Utils/CLAUDE.md`
- Modify: `Appy/DTOs/CLAUDE.md`

This is the production wiring (unit tests build their own `JsonSerializerOptions`, so they don't exercise `Program.cs`). Verified by build + the full test suite; runtime behavior is verified by the converter unit tests and the PR's E2E run.

- [ ] **Step 1: Register the converter**

In `Appy/Program.cs`, replace this block:

```csharp
builder.Services
    .AddControllers(opts => opts.UseDateOnlyTimeOnlyStringConverters())
    .AddJsonOptions(opts => opts.UseDateOnlyTimeOnlyStringConverters());
```

with:

```csharp
builder.Services
    .AddControllers(opts => opts.UseDateOnlyTimeOnlyStringConverters())
    .AddJsonOptions(opts =>
    {
        opts.UseDateOnlyTimeOnlyStringConverters();
        opts.JsonSerializerOptions.Converters.Add(new Appy.Utils.TrimmingStringConverter());
    });
```

(Fully-qualified `Appy.Utils.TrimmingStringConverter` avoids touching the using block; no other change to `Program.cs`.)

- [ ] **Step 2: Build to verify it compiles**

Run: `dotnet build`
Expected: Build succeeded, 0 errors.

- [ ] **Step 3: Update `Appy/Utils/CLAUDE.md`**

Add a section after the Configuration section:

```markdown
## JSON String Converters

Two `System.Text.Json` converters sanitize request-body input:

- **`TrimmingStringConverter`** — registered globally in `Program.cs` (`AddJsonOptions`). Trims leading/trailing whitespace from every string during deserialization, including strings in nested objects and collections. Write is a passthrough, so responses are unchanged.
- **`NoTrimStringConverter`** — a passthrough (no-trim) converter applied per-property via `[JsonConverter(typeof(NoTrimStringConverter))]` to opt out of global trimming. Used on password fields, where surrounding whitespace is significant. A property-level attribute overrides the globally-registered converter.

Scope: JSON request bodies only — query-string parameters are not affected.
```

- [ ] **Step 4: Update `Appy/DTOs/CLAUDE.md`**

Add a section after "Separation from Domain Entities":

```markdown
## Input Trimming

Strings in request-body DTOs are trimmed of leading/trailing whitespace during deserialization by the globally-registered `TrimmingStringConverter` (see `Utils/CLAUDE.md`). This applies to nested DTOs and collections automatically. Password fields (`LogInDTO.Password`, `RegisterDTO.Password`) opt out via `[JsonConverter(typeof(NoTrimStringConverter))]` because whitespace in a password is significant.
```

- [ ] **Step 5: Run the full test suite**

Run: `dotnet test`
Expected: PASS — all tests green (existing suite + 3 new converter tests).

- [ ] **Step 6: Commit**

```bash
git add Appy/Program.cs Appy/Utils/CLAUDE.md Appy/DTOs/CLAUDE.md
git commit -m "feat(sanitize): register global input trimming + document converters (#37)"
```

---

## Self-Review

**Spec coverage:**
- Global trimming of request-body strings → Task 1 (converter) + Task 3 (registration). ✓
- Nested objects/collections trimmed → Task 1 test (`ClientDTO.Contacts[].Value`). ✓
- Password opt-out (`LogInDTO`, `RegisterDTO`) → Task 2. ✓
- `null` preserved / whitespace-only → empty → Task 1 test. ✓
- Scope boundary (bodies only, not query strings) → documented in Task 3 docs. ✓
- Docs updated (`DTOs/CLAUDE.md`, `Utils/CLAUDE.md`) → Task 3. ✓

**Placeholder scan:** None — all steps contain concrete code/commands.

**Type consistency:** `TrimmingStringConverter` and `NoTrimStringConverter` (both `JsonConverter<string>`, `Read` returns `string?`) are referenced identically in tests, DTOs, and `Program.cs`. Namespace `Appy.Utils` consistent throughout.

---

## Manual / E2E Validation (after Task 3)

The PR triggers the E2E workflow (real Postgres + backend + frontend + Cypress). Existing login/register/client/appointment flows should remain green. Optionally, manually confirm via Playwright MCP that creating a client with a padded name (`"  Test  "`) stores/displays it trimmed.
