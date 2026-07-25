# CLAUDE.md — Backend Utilities (Utils/)

Small helpers that don't belong to any domain concept.

| File | Purpose |
|------|---------|
| `TrimmingStringConverter` | Globally registered `System.Text.Json` converter that trims every string in a request body |
| `NoTrimStringConverter` | Per-property opt-out from the global trimming, applied to password fields |
| `StringExtensions` | String helpers used across the backend |
| `HttpExtensions` | `HttpContext` / request helpers |

Trimming applies to JSON request bodies only — query-string parameters are untouched.
