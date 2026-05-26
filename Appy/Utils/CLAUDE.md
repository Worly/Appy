# CLAUDE.md — Backend Utilities (Utils/)

Small utility classes that don't belong to a specific domain concept.

## ConfigurationService

Abstracts environment-specific configuration loading so services reference the same property names regardless of environment:

- **Development** (`ASPNETCORE_ENVIRONMENT=Development`): reads from `appsettings.json`
- **Production**: reads from environment variables in UPPER_SNAKE_CASE (`JWT_SECRET`, `POSTGRES_HOSTNAME`, etc.)

Inject `ConfigurationService` wherever configuration values are needed. Do not inject `IConfiguration` directly in services, as the mapping logic lives here.
