# Configuration Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the custom `ConfigurationService` with ASP.NET Core's built-in `IConfiguration` pipeline, remove committed secrets from appsettings files, and set up User Secrets for local dev.

**Architecture:** `IConfiguration` is already a layered provider that reads appsettings → User Secrets → environment variables automatically. The custom `ConfigurationService` reinvents this wheel with environment-switching logic that breaks CI. Deleting it and wiring consumers directly to `IConfiguration` makes all environments work consistently with no custom code.

**Tech Stack:** ASP.NET Core 8, `IConfiguration`, .NET User Secrets (`Microsoft.Extensions.Configuration.UserSecrets`, included by default in `Microsoft.NET.Sdk.Web`)

**Spec:** `docs/superpowers/specs/2026-05-26-config-cleanup-design.md` (on `dotnet8-upgrade` branch)

---

### Task 1: Add UserSecretsId to Appy.csproj

**Files:**
- Modify: `Appy/Appy.csproj`

- [ ] **Step 1: Add `<UserSecretsId>` to the PropertyGroup**

In `Appy/Appy.csproj`, add `<UserSecretsId>` inside the existing `<PropertyGroup>`:

```xml
<PropertyGroup>
  <TargetFramework>net8.0</TargetFramework>
  <Nullable>enable</Nullable>
  <ImplicitUsings>enable</ImplicitUsings>
  <SpaRoot>Appy-frontend\</SpaRoot>
  <DefaultItemExcludes>$(DefaultItemExcludes);$(SpaRoot)node_modules\**</DefaultItemExcludes>
  <ServerGarbageCollection>false</ServerGarbageCollection>
  <UserSecretsId>appy-backend-secrets</UserSecretsId>
</PropertyGroup>
```

- [ ] **Step 2: Build to verify**

Run from repo root:
```
dotnet build Appy/Appy.csproj
```
Expected: `Build succeeded.`

- [ ] **Step 3: Commit**

```
git add Appy/Appy.csproj
git commit -m "chore: add UserSecretsId to enable dotnet user-secrets"
```

---

### Task 2: Update JwtService to inject IConfiguration directly

**Files:**
- Modify: `Appy/Auth/JwtService.cs`

- [ ] **Step 1: Replace IConfigurationService with IConfiguration in JwtService**

Replace the full constructor in `Appy/Auth/JwtService.cs`. The `using` for `WappChatAnalyzer.Services` can be removed; add `using Microsoft.Extensions.Configuration;` at the top if not already present via implicit usings.

Full updated file:

```csharp
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace Appy.Services
{
    public interface IJwtService
    {
        Task<(bool valid, JwtSecurityToken? token)> ValidateToken(string token, bool validateLifetime = true);
        JwtSecurityToken? ParseToken(string token);
        string GenerateToken(TimeSpan lifespan, params Claim[] claims);
    }

    public class JwtService : IJwtService
    {
        private string jwtSecret;

        public JwtService(IConfiguration configuration)
        {
            this.jwtSecret = configuration["JwtSecret"]!;
        }

        public async Task<(bool valid, JwtSecurityToken? token)> ValidateToken(string token, bool validateLifetime = true)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                var key = Encoding.ASCII.GetBytes(jwtSecret);
                var result = await tokenHandler.ValidateTokenAsync(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ValidateLifetime = validateLifetime,
                    ClockSkew = TimeSpan.Zero,
                });

                if (!result.IsValid)
                    return (false, null);

                return (true, result.SecurityToken as JwtSecurityToken);
            }
            catch
            {
                return (false, null);
            }
        }

        public JwtSecurityToken? ParseToken(string token)
        {
            try
            {
                var tokenHandler = new JwtSecurityTokenHandler();
                return tokenHandler.ReadJwtToken(token);
            }
            catch (Exception)
            {
                return null;
            }
        }

        public string GenerateToken(TimeSpan lifespan, params Claim[] claims)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.ASCII.GetBytes(jwtSecret);
            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.Add(lifespan),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }
    }
}
```

Note: `configuration["JwtSecret"]!` uses the null-forgiving operator because validation is handled at startup in Program.cs (Task 3) — by the time JwtService is constructed, the value is guaranteed non-null.

- [ ] **Step 2: Build to verify**

```
dotnet build Appy/Appy.csproj
```
Expected: `Build succeeded.`

- [ ] **Step 3: Run existing unit tests**

```
dotnet test Appy.Tests/Appy.Tests.csproj
```
Expected: All tests pass.

- [ ] **Step 4: Commit**

```
git add Appy/Auth/JwtService.cs
git commit -m "refactor: inject IConfiguration into JwtService directly"
```

---

### Task 3: Update Program.cs — validation, remove custom blocks, remove ConfigurationService DI

**Files:**
- Modify: `Appy/Program.cs`

- [ ] **Step 1: Add fail-fast JwtSecret validation**

At the very top of `Appy/Program.cs`, right after `var builder = WebApplication.CreateBuilder(args);` and before any service registrations, add:

```csharp
var jwtSecret = builder.Configuration["JwtSecret"];
if (string.IsNullOrEmpty(jwtSecret))
    throw new InvalidOperationException(
        "JwtSecret is not configured. Set it via User Secrets (dev) or the JwtSecret environment variable (CI/prod).");
```

- [ ] **Step 2: Remove the POSTGRES_HOSTNAME custom block**

In `Program.cs`, locate and delete this entire block (approximately lines 13–28 of the original file):

```csharp
var connectionString = builder.Configuration.GetConnectionString("Main");
if (Environment.GetEnvironmentVariable("POSTGRES_HOSTNAME") != null)
{
    var hostname = Environment.GetEnvironmentVariable("POSTGRES_HOSTNAME");
    var port = Environment.GetEnvironmentVariable("POSTGRES_PORT");
    if (port == null)
        throw new ArgumentNullException("POSTGRES_PORT");

    var user = Environment.GetEnvironmentVariable("POSTGRES_USER");
    if (user == null)
        throw new ArgumentNullException("POSTGRES_USER");

    var password = Environment.GetEnvironmentVariable("POSTGRES_PASSWORD");
    if (password == null)
        throw new ArgumentNullException("POSTGRES_PASSWORD");

    connectionString = $"Server={hostname};Port={port};Database=Appy;Userid={user};Password={password}";
}

builder.Services.AddDbContext<MainDbContext>(options => options.UseNpgsql(connectionString));
```

Replace it with the single line (the GetConnectionString call is still needed):

```csharp
builder.Services.AddDbContext<MainDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Main")));
```

- [ ] **Step 3: Remove ConfigurationService DI registration**

Find and delete these two lines from `Program.cs`:

```csharp
builder.Services.AddSingleton<IConfigurationService, ConfigurationService>();
```

Also remove the `using WappChatAnalyzer.Services;` import at the top of `Program.cs` if it is now unused (check that no other symbol from that namespace is still referenced).

- [ ] **Step 4: Build to verify**

```
dotnet build Appy/Appy.csproj
```
Expected: `Build succeeded.`

- [ ] **Step 5: Run existing unit tests**

```
dotnet test Appy.Tests/Appy.Tests.csproj
```
Expected: All tests pass.

- [ ] **Step 6: Commit**

```
git add Appy/Program.cs
git commit -m "refactor: remove custom POSTGRES_* and ConfigurationService wiring from Program.cs"
```

---

### Task 4: Delete ConfigurationService.cs

**Files:**
- Delete: `Appy/Services/ConfigurationService.cs`

- [ ] **Step 1: Delete the file**

```
git rm Appy/Services/ConfigurationService.cs
```

- [ ] **Step 2: Build to verify no remaining references**

```
dotnet build Appy/Appy.csproj
```
Expected: `Build succeeded.` with no errors about missing types.

- [ ] **Step 3: Run existing unit tests**

```
dotnet test Appy.Tests/Appy.Tests.csproj
```
Expected: All tests pass.

- [ ] **Step 4: Commit**

```
git commit -m "refactor: delete ConfigurationService — replaced by built-in IConfiguration pipeline"
```

---

### Task 5: Clean appsettings files

**Files:**
- Modify: `Appy/appsettings.json`
- Modify: `Appy/appsettings.Development.json`

- [ ] **Step 1: Update appsettings.json — remove all real secrets**

Replace the full contents of `Appy/appsettings.json` with:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "Main": ""
  },
  "JwtSecret": ""
}
```

- [ ] **Step 2: Update appsettings.Development.json — remove all secrets, keep only logging**

Replace the full contents of `Appy/appsettings.Development.json` with:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  }
}
```

- [ ] **Step 3: Build to verify**

```
dotnet build Appy/Appy.csproj
```
Expected: `Build succeeded.`

- [ ] **Step 4: Commit**

```
git add Appy/appsettings.json Appy/appsettings.Development.json
git commit -m "chore: remove secrets from committed appsettings files"
```

---

### Task 6: Verify fail-fast validation and User Secrets

This task confirms the app correctly refuses to start without `JwtSecret` and correctly starts once it is provided via User Secrets.

- [ ] **Step 1: Attempt to run without JwtSecret configured**

```
dotnet run --project Appy -- --no-frontend
```

Expected: App immediately throws and exits with:
```
Unhandled exception. System.InvalidOperationException: JwtSecret is not configured. Set it via User Secrets (dev) or the JwtSecret environment variable (CI/prod).
```

- [ ] **Step 2: Set JwtSecret via User Secrets**

```
dotnet user-secrets set "JwtSecret" "local-dev-secret-change-me" --project Appy
```

Expected output: `Successfully saved JwtSecret = local-dev-secret-change-me to the secret store.`

- [ ] **Step 3: Set ConnectionStrings:Main via User Secrets**

Replace `<password>` with your actual local Postgres password:

```
dotnet user-secrets set "ConnectionStrings:Main" "Server=localhost;Port=5432;Database=Appy;Userid=AppyUser;Password=<password>" --project Appy
```

Expected output: `Successfully saved ConnectionStrings:Main = ... to the secret store.`

- [ ] **Step 4: Run the app and confirm it starts**

```
dotnet run --project Appy
```

Expected: App starts and `GET https://localhost:5001/health` returns `200 OK`. No startup exceptions.

---

### Task 7: Update CI workflow

**Files:**
- Modify: `.github/workflows/e2e_on_pr.yml`

- [ ] **Step 1: Replace POSTGRES_* env vars and add JwtSecret**

In `.github/workflows/e2e_on_pr.yml`, find the `env:` block under the `e2e` job and replace it with:

```yaml
    env:
      ASPNETCORE_ENVIRONMENT: Development
      JwtSecret: "ci-throwaway-secret-not-used-in-production"
      ConnectionStrings__Main: "Server=localhost;Port=5432;Database=Appy;Userid=postgres;Password=password"
      NO_FRONTEND: true
```

Note: `ConnectionStrings__Main` uses double underscores — that's ASP.NET Core's convention for mapping env vars to nested config keys (`ConnectionStrings:Main` → `ConnectionStrings__Main`).

- [ ] **Step 2: Commit**

```
git add .github/workflows/e2e_on_pr.yml
git commit -m "ci: switch to standard ASP.NET Core env var names for config"
```

---

### Task 8: Update home-server-config README

**Files:**
- Modify: `C:\Dev\home-server-config\WebServer\README.md`

- [ ] **Step 1: Update the Appy container env vars table**

Locate the Appy container environment variables table in `C:\Dev\home-server-config\WebServer\README.md` and replace it with:

```html
<table>
    <thead>
        <tr>
            <th>Name</th>
            <th>Value</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>JwtSecret</td>
            <td>&lt;random characters&gt;</td>
        </tr>
        <tr>
            <td>ConnectionStrings__Main</td>
            <td>Server=PostgreSQL;Port=5432;Database=Appy;Userid=postgres;Password=&lt;same password as PostgreSQL container's POSTGRES_PASSWORD&gt;</td>
        </tr>
    </tbody>
</table>
```

Note: `ConnectionStrings__Main` (double underscore) is the env var name. The value follows standard Npgsql connection string format: `Server=<host>;Port=<port>;Database=<db>;Userid=<user>;Password=<password>`.

- [ ] **Step 2: Add a production migration note**

Directly above the updated env vars table, add a callout:

```html
> **Migration note:** If upgrading from a previous version, remove the old env vars
> `JWT_SECRET`, `POSTGRES_HOSTNAME`, `POSTGRES_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`
> and replace with the two vars below. Update the Portainer container and restart.
```

- [ ] **Step 3: Commit in home-server-config repo**

```
cd C:\Dev\home-server-config
git add WebServer/README.md
git commit -m "docs: update Appy env vars to standard ASP.NET Core naming"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full build**

From repo root:
```
dotnet build
```
Expected: `Build succeeded.` for both `Appy` and `Appy.Tests`.

- [ ] **Step 2: Run all unit tests**

```
dotnet test
```
Expected: All tests pass.

- [ ] **Step 3: Confirm no secrets in committed files**

```
git grep -n "F5Xp85RBK5iu8wWmUt4T" -- "*.json"
git grep -n "oadhgauiosd" -- "*.json"
```
Expected: No output (both greps return nothing).

- [ ] **Step 4: Push branch**

```
git push -u origin config-cleanup
```
