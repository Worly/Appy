# CLAUDE.md — Backend Utilities (Utils/)

Small utility classes that don't belong to a specific domain concept.

## Configuration

Configuration is handled by ASP.NET Core's built-in `IConfiguration` pipeline:

- **Development** (`ASPNETCORE_ENVIRONMENT=Development`): reads from `appsettings.json` and User Secrets
- **Production**: reads from environment variables (UPPER_SNAKE_CASE — `JWT_SECRET`, `POSTGRES_HOSTNAME`, etc.)

Inject `IConfiguration` directly in services and call `configuration["KeyName"]` to retrieve values.

## JSON String Converters

Two `System.Text.Json` converters sanitize request-body input:

- **`TrimmingStringConverter`** — registered globally in `Program.cs` (`AddJsonOptions`). Trims leading/trailing whitespace from every string during deserialization, including strings in nested objects and collections. Write is a passthrough, so responses are unchanged.
- **`NoTrimStringConverter`** — a passthrough (no-trim) converter applied per-property via `[JsonConverter(typeof(NoTrimStringConverter))]` to opt out of global trimming. Used on password fields, where surrounding whitespace is significant. A property-level attribute overrides the globally-registered converter.

Scope: JSON request bodies only — query-string parameters are not affected.
