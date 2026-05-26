# CLAUDE.md — Backend Utilities (Utils/)

Small utility classes that don't belong to a specific domain concept.

## Configuration

Configuration is handled by ASP.NET Core's built-in `IConfiguration` pipeline:

- **Development** (`ASPNETCORE_ENVIRONMENT=Development`): reads from `appsettings.json` and User Secrets
- **Production**: reads from environment variables (UPPER_SNAKE_CASE — `JWT_SECRET`, `POSTGRES_HOSTNAME`, etc.)

Inject `IConfiguration` directly in services and call `configuration["KeyName"]` to retrieve values.
