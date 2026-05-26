# .NET 8 Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the Appy backend and test project from .NET 6 to .NET 8.

**Architecture:** Bump target frameworks in both csproj files, update all NuGet packages to .NET 8-compatible versions, and remove stale/dead packages that no longer apply. No structural code changes are expected — all three `DateTime` columns in the schema are `timestamp with time zone`, which aligns perfectly with Npgsql 8's default behavior, so no compatibility shims are needed. The minimal API hosting model and all middleware are identical in .NET 8.

**Tech Stack:** ASP.NET Core 8, EF Core 8, Npgsql 8, xUnit on .NET 8.

---

## Files Changed

| File | Change |
|------|--------|
| `Appy/Appy.csproj` | Bump framework, update/remove packages |
| `Appy.Tests/Appy.Tests.csproj` | Bump framework, update/remove packages |
| `Appy/CLAUDE.md` | Update .NET version reference |
| `Appy.Tests/CLAUDE.md` | Remove incorrect "discrepancy" note |

---

### Task 1: Update Appy.csproj

**Files:**
- Modify: `Appy/Appy.csproj`

Three categories of change:
- Framework bump: `net6.0` → `net8.0`
- Package upgrades: EF Core, Npgsql, SpaServices.Extensions, Swashbuckle, JWT
- Package removals: `Microsoft.AspNetCore.SpaServices` 3.1.27 (3.1-era package, not used — the AngularCli namespace comes from `.Extensions`), `Microsoft.NET.Test.Sdk` (test SDK in a web project, shouldn't be here), `NUnit`, `NUnit3TestAdapter` (unused — tests are xUnit in Appy.Tests/)

- [ ] **Step 1: Replace Appy/Appy.csproj content**

Replace the entire `<ItemGroup>` of package references with the following. Leave the `<PropertyGroup>` and the SPA build targets untouched.

```xml
<Project Sdk="Microsoft.NET.Sdk.Web">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <Nullable>enable</Nullable>
    <ImplicitUsings>enable</ImplicitUsings>
    <SpaRoot>Appy-frontend\</SpaRoot>
    <DefaultItemExcludes>$(DefaultItemExcludes);$(SpaRoot)node_modules\**</DefaultItemExcludes>
    <ServerGarbageCollection>false</ServerGarbageCollection>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="CronScheduler.AspNetCore" Version="3.2.0" />
    <PackageReference Include="DateOnlyTimeOnly.AspNet" Version="1.0.3" />
    <PackageReference Include="EntityFrameworkCore.Exceptions.PostgreSQL" Version="8.*" />
    <PackageReference Include="Microsoft.AspNetCore.SpaServices.Extensions" Version="8.*" />
    <PackageReference Include="Microsoft.EntityFrameworkCore" Version="8.*" />
    <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.*">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
    <PackageReference Include="Npgsql.EntityFrameworkCore.PostgreSQL" Version="8.*" />
    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.*" />
    <PackageReference Include="System.IdentityModel.Tokens.Jwt" Version="7.*" />
  </ItemGroup>

  <ItemGroup>
    <!-- Don't publish the SPA source files, but do show them in the project files list -->
    <Content Remove="$(SpaRoot)**" />
    <None Remove="$(SpaRoot)**" />
    <None Include="$(SpaRoot)**" Exclude="$(SpaRoot)node_modules\**" />
  </ItemGroup>

  <Target Name="DebugEnsureNodeEnv" BeforeTargets="Build" 
          Condition="'$(Configuration)' == 'Debug' And !Exists('$(SpaRoot)node_modules') And '$(NO_FRONTEND)' != 'true'">
    <!-- Ensure Node.js is installed -->
    <Exec Command="node --version" ContinueOnError="true">
      <Output TaskParameter="ExitCode" PropertyName="ErrorCode" />
    </Exec>
    <Error Condition="'$(ErrorCode)' != '0'" Text="Node.js is required to build and run this project. To continue, please install Node.js from https://nodejs.org/, and then restart your command prompt or IDE." />
    <Message Importance="high" Text="Restoring dependencies using 'npm'. This may take several minutes..." />
    <Exec WorkingDirectory="$(SpaRoot)" Command="npm install" />
  </Target>

  <Target Name="PublishRunWebpack" AfterTargets="ComputeFilesToPublish">
    <!-- As part of publishing, ensure the JS resources are freshly built in production mode -->
    <Exec WorkingDirectory="$(SpaRoot)" Command="npm install" />
    <Exec WorkingDirectory="$(SpaRoot)" Command="npm run build" />

    <!-- Include the newly-built files in the publish output -->
    <ItemGroup>
      <DistFiles Include="$(SpaRoot)build\**" />
      <ResolvedFileToPublish Include="@(DistFiles->'%(FullPath)')" Exclude="@(ResolvedFileToPublish)">
        <RelativePath>%(DistFiles.Identity)</RelativePath>
        <CopyToPublishDirectory>PreserveNewest</CopyToPublishDirectory>
        <ExcludeFromSingleFile>true</ExcludeFromSingleFile>
      </ResolvedFileToPublish>
    </ItemGroup>
  </Target>

</Project>
```

- [ ] **Step 2: Restore packages**

Run from the repo root:
```
dotnet restore Appy
```

Expected: restore succeeds, packages resolved under `8.*` versions. No errors.

- [ ] **Step 3: Commit**

```
git add Appy/Appy.csproj
git commit -m "chore: bump main project to net8.0, update packages"
```

---

### Task 2: Update Appy.Tests.csproj

**Files:**
- Modify: `Appy.Tests/Appy.Tests.csproj`

Changes:
- Framework bump: `net6.0` → `net8.0`
- `Microsoft.Extensions.Caching.Memory` → `8.*`
- `Moq.EntityFrameworkCore` → `8.*` (must match EF Core major version)
- Remove `System.Text.RegularExpressions` 4.3.1 — built into .NET 8, this standalone package is a 2016-era portability shim that has no place here

- [ ] **Step 1: Replace Appy.Tests/Appy.Tests.csproj content**

```xml
<Project Sdk="Microsoft.NET.Sdk">

  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
    <IsPackable>false</IsPackable>
    <IsTestProject>true</IsTestProject>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="AutoFixture" Version="4.18.1" />
    <PackageReference Include="coverlet.collector" Version="6.0.0" />
    <PackageReference Include="FluentAssertions" Version="7.0.0" />
    <PackageReference Include="Microsoft.Extensions.Caching.Memory" Version="8.*" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.12.0" />
    <PackageReference Include="Moq" Version="4.20.72" />
    <PackageReference Include="Moq.EntityFrameworkCore" Version="8.*" />
    <PackageReference Include="xunit" Version="2.9.2" />
    <PackageReference Include="xunit.runner.visualstudio" Version="3.0.0">
      <PrivateAssets>all</PrivateAssets>
      <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    </PackageReference>
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\Appy\Appy.csproj" />
  </ItemGroup>

  <ItemGroup>
    <Using Include="Xunit" />
  </ItemGroup>

</Project>
```

- [ ] **Step 2: Restore packages**

```
dotnet restore Appy.Tests
```

Expected: restore succeeds.

- [ ] **Step 3: Run the tests**

```
dotnet test Appy.Tests
```

Expected: all tests pass. If any test fails, it will be a real behavior regression — investigate and fix before proceeding.

- [ ] **Step 4: Commit**

```
git add Appy.Tests/Appy.Tests.csproj
git commit -m "chore: bump test project to net8.0, update packages"
```

---

### Task 3: Full Build and Smoke Test

- [ ] **Step 1: Full solution build**

```
dotnet build
```

Expected: zero errors. Warnings about nullable or `[Obsolete]` on `UseAngularCliServer` are fine.

- [ ] **Step 2: Run all tests**

```
dotnet test
```

Expected: all tests pass.

- [ ] **Step 3: Start the backend with NO_FRONTEND=true**

```
$env:NO_FRONTEND = "true"; dotnet run --project Appy
```

Expected output includes:
```
Updating database!
Now listening on: https://localhost:5001
```

If it crashes on database connection, verify PostgreSQL is running and the connection string in `appsettings.json` is correct.

- [ ] **Step 4: Hit the health check**

```
curl -k https://localhost:5001/health
```

Expected: `Healthy`

- [ ] **Step 5: Stop the backend (Ctrl+C) and commit**

```
git add -A
git commit -m "chore: verify net8 upgrade — build clean, tests pass, app starts"
```

---

### Task 4: Update CLAUDE.md Files

**Files:**
- Modify: `Appy/CLAUDE.md`
- Modify: `Appy.Tests/CLAUDE.md`

- [ ] **Step 1: Update Appy/CLAUDE.md**

Change the first line heading from:
```
ASP.NET Core 6 Web API.
```
to:
```
ASP.NET Core 8 Web API.
```

- [ ] **Step 2: Update Appy.Tests/CLAUDE.md**

Change the first paragraph from:
```
xUnit unit tests for backend service logic. Targets **.NET 8.0** (the main project targets .NET 6.0 — this discrepancy is intentional; tests run on the newer runtime).
```
to:
```
xUnit unit tests for backend service logic. Targets **.NET 8.0**, same as the main project.
```

- [ ] **Step 3: Update root CLAUDE.md**

Change the stack line from:
```
**Stack**: ASP.NET Core 6 backend + Angular 16 frontend + PostgreSQL
```
to:
```
**Stack**: ASP.NET Core 8 backend + Angular 16 frontend + PostgreSQL
```

- [ ] **Step 4: Commit**

```
git add Appy/CLAUDE.md Appy.Tests/CLAUDE.md CLAUDE.md
git commit -m "docs: update CLAUDE.md files to reflect net8 upgrade"
```
