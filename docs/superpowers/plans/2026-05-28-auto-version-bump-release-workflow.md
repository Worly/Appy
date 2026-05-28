# Auto Version Bump Release Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make creating a GitHub release the only manual step — the workflow extracts the tag, validates it, rewrites `package.json`, and publishes versioned Docker images automatically.

**Architecture:** Git tag is the single source of truth for version. The release workflow reads `github.ref_name`, validates it is strict semver (`vX.Y.Z`), strips the `v`, patches `package.json` with `jq` before the Docker build context is sent, then uses `docker/metadata-action` to derive four Docker tags (`latest`, major, major.minor, full semver).

**Tech Stack:** GitHub Actions, Docker Buildx, `docker/metadata-action@v5`, `docker/build-push-action@v5`, `jq` (pre-installed on `ubuntu-latest`), .NET 8 SDK + ASP.NET 8 runtime.

---

## File Map

| File | Change |
|---|---|
| `Appy/Dockerfile` | Bump SDK and runtime base images from .NET 6 → .NET 8 |
| `Appy/Appy-frontend/package.json` | Set `version` to `"0.0.0-development"` |
| `.github/workflows/build_and_push_image.yml` | Full rewrite — checkout, validate tag, patch package.json, metadata-action, versioned tags |

---

## Task 1: Bump Dockerfile to .NET 8

**Files:**
- Modify: `Appy/Dockerfile`

- [ ] **Step 1.1 — Update SDK base image**

In `Appy/Dockerfile`, line 3, change:
```dockerfile
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:6.0 AS build-env
```
to:
```dockerfile
FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
```

- [ ] **Step 1.2 — Update runtime base image**

In `Appy/Dockerfile`, line 19, change:
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:6.0
```
to:
```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0
```

- [ ] **Step 1.3 — Verify the file looks correct**

The final `Appy/Dockerfile` should be:
```dockerfile
# Dockerfile

FROM --platform=$BUILDPLATFORM mcr.microsoft.com/dotnet/sdk:8.0 AS build-env
WORKDIR /app
RUN apt-get update -yq \
    && apt-get install curl gnupg -yq \
    && curl -sL https://deb.nodesource.com/setup_16.x | bash \
    && apt-get install nodejs -yq

# Copy csproj and restore as distinct layers
COPY *.csproj ./
RUN dotnet restore

# Copy everything else and build
COPY . .
RUN dotnet publish -c Release -o out

# Build runtime image
FROM mcr.microsoft.com/dotnet/aspnet:8.0
WORKDIR /app
RUN apt-get update -yq \
    && apt-get install curl -yq

COPY --from=build-env /app/out .
ENTRYPOINT ["dotnet", "Appy.dll"]

HEALTHCHECK --interval=10s --timeout=10s --start-period=30s --retries=2 CMD curl --fail http://localhost:80/health || exit 1
```

- [ ] **Step 1.4 — Commit**

```bash
git add Appy/Dockerfile
git commit -m "fix: bump Dockerfile base images to .NET 8"
```

---

## Task 2: Pin package.json version to placeholder

**Files:**
- Modify: `Appy/Appy-frontend/package.json`

- [ ] **Step 2.1 — Set version field to placeholder**

In `Appy/Appy-frontend/package.json`, change line 3:
```json
"version": "3.2.0",
```
to:
```json
"version": "0.0.0-development",
```

This is the only change. The rest of the file is untouched.

- [ ] **Step 2.2 — Commit**

```bash
git add Appy/Appy-frontend/package.json
git commit -m "chore: pin package.json version to 0.0.0-development (set at build time)"
```

---

## Task 3: Rewrite the release workflow

**Files:**
- Modify: `.github/workflows/build_and_push_image.yml`

- [ ] **Step 3.1 — Test the tag-validation shell logic locally**

Before writing the workflow file, verify the shell logic is correct. Run this in a bash shell (Git Bash or WSL on Windows):

```bash
# Simulate a valid tag
TAG="v3.3.0"
if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: bad tag"
  exit 1
fi
APP_VERSION="${TAG#v}"
echo "APP_VERSION=$APP_VERSION"
# Expected output: APP_VERSION=3.3.0

# Simulate an invalid tag — should print error
TAG="v3.3"
if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "ERROR: Tag '$TAG' does not match expected format v<major>.<minor>.<patch>"
fi
# Expected output: ERROR: Tag 'v3.3' does not match expected format v<major>.<minor>.<patch>
```

Expected: first block prints `APP_VERSION=3.3.0`; second block prints the error line.

- [ ] **Step 3.2 — Replace the workflow file entirely**

Overwrite `.github/workflows/build_and_push_image.yml` with:

```yaml
name: build_and_push_image

on:
  release:
    types: [published]

permissions:
  contents: read

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Validate and extract version
        run: |
          TAG="${{ github.ref_name }}"
          if [[ ! "$TAG" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "ERROR: Tag '$TAG' does not match expected format v<major>.<minor>.<patch> (e.g. v3.3.0)"
            exit 1
          fi
          APP_VERSION="${TAG#v}"
          echo "APP_VERSION=$APP_VERSION" >> "$GITHUB_ENV"
          echo "Extracted version: $APP_VERSION"

      - name: Bump package.json version
        run: |
          jq --arg v "$APP_VERSION" '.version = $v' Appy/Appy-frontend/package.json > /tmp/pkg.json
          mv /tmp/pkg.json Appy/Appy-frontend/package.json
          echo "package.json version set to $APP_VERSION"

      - name: Set up QEMU
        uses: docker/setup-qemu-action@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to DockerHub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: worly/appy
          tags: |
            type=semver,pattern={{version}}
            type=semver,pattern={{major}}.{{minor}}
            type=semver,pattern={{major}}
            type=raw,value=latest

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: "{{defaultContext}}:Appy"
          platforms: linux/arm64,linux/amd64
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          push: true

      - name: Notify Watchtower
        run: |
          curl -H "Authorization: Bearer ${{ secrets.WATCHTOWER_TOKEN }}" http://worly.ddnsfree.com:9898/v1/update
```

- [ ] **Step 3.3 — Validate YAML syntax**

Run on the workflow file. On Windows with Docker Desktop:

```bash
docker run --rm -v "${PWD}:/repo" rhysd/actionlint:latest /repo/.github/workflows/build_and_push_image.yml
```

Expected: no errors. If actionlint is unavailable, at minimum verify the file parses as valid YAML:

```bash
python -c "import yaml, sys; yaml.safe_load(open('.github/workflows/build_and_push_image.yml')); print('YAML OK')"
```

Expected output: `YAML OK`

- [ ] **Step 3.4 — Commit**

```bash
git add .github/workflows/build_and_push_image.yml
git commit -m "feat: automate version bump and add versioned Docker tags in release workflow (#111)"
```

---

## Task 4: Post-release verification checklist

This task is a reminder for when the next real release is cut. It is not a code task.

- [ ] Create a GitHub release with a valid tag (e.g. `v3.3.0`).
- [ ] Confirm the Actions run succeeds — specifically that the "Validate and extract version" and "Bump package.json version" steps show correct output in the logs.
- [ ] On DockerHub, confirm four tags exist on the new image digest: `3.3.0`, `3.3`, `3`, `latest`.
- [ ] Run: `docker image inspect worly/appy:3.3.0 | grep -A5 Labels` — confirm `org.opencontainers.image.version` is `3.3.0`.
- [ ] Confirm Watchtower on the host picked up the new image (check container uptime or host logs).
