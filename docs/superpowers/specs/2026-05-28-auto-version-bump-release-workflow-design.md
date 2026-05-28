# Automate version bump in release workflow

**Issue:** [#111 — Automate version string update in release workflow](https://github.com/Worly/Appy/issues/111)
**Branch:** `feat/auto-version-bump-release-workflow`
**Date:** 2026-05-28

## Problem

Cutting a release today requires a manual commit that bumps the `version` field in
`Appy/Appy-frontend/package.json` (the `v3.2.0`, `v3.1.1`, etc. commits on `main`).
This is easy to forget and adds friction to the release process. We want creating a
GitHub release to be the only manual step.

## Decision: git tag is the source of truth

The release tag (e.g. `v3.3.0`) is the canonical version. The release workflow derives
the version from `github.ref_name` at build time. CI **does not** commit back to `main`.

This is the standard pattern used by Kubernetes, Docker, HashiCorp, Grafana, and most
mature OSS projects, because:

1. Single source of truth — no ambiguity between `package.json` on `main` and the released artifact.
2. CI writing to `main` is an anti-pattern — permissions surface, potential commit loops, audit-trail noise, race conditions when releases land close together.
3. The release record (GitHub Release + git tag) already documents what shipped when. Duplicate `vX.Y.Z` commits add nothing.

To make the "version on `main` is meaningless" contract explicit, `main`'s
`package.json` is pinned to a static placeholder (`0.0.0-development`).

## Changes

### 1. `Appy/Appy-frontend/package.json`

Set `version` to `"0.0.0-development"`. Never updated by hand again.

### 2. `.github/workflows/build_and_push_image.yml`

Triggered on `release: published` (unchanged). Adds job-level `permissions: contents: read` — least privilege, explicit drop of write.

New step order:

1. **Checkout the release ref** (`actions/checkout@v4`). Required so the workspace contains the files we need to mutate before sending the Docker build context.
2. **Validate & extract version.** Shell step that:
   - Reads `github.ref_name` (e.g. `v3.3.0`).
   - Validates it against `^v[0-9]+\.[0-9]+\.[0-9]+$`. Fails the job with a clear error message if it doesn't match — no pre-release suffixes, no ambiguous formats.
   - Strips the leading `v` and exports the cleaned version (e.g. `3.3.0`) to `$GITHUB_ENV` as `APP_VERSION`.
3. **Rewrite `package.json` version.** A `jq` step that sets `.version = env.APP_VERSION` and writes the file in place. `jq` (JSON-aware) is used instead of `sed` so it cannot accidentally match other `"version"` lines or corrupt the file.
4. **Set up QEMU / Buildx / DockerHub login.** Same actions as today, repinned to current GA majors: `docker/setup-qemu-action@v3`, `docker/setup-buildx-action@v3`, `docker/login-action@v3`.
5. **`docker/metadata-action@v5`.** Derives image tags and OCI labels from the git ref. Configured to emit:
   - `worly/appy:3.3.0` (full semver)
   - `worly/appy:3.3` (major.minor — rollback to latest patch of a minor line)
   - `worly/appy:3` (major — rollback to latest of a major line)
   - `worly/appy:latest` (kept so Watchtower's existing watch continues working)
6. **`docker/build-push-action@v5`.** Consumes `outputs.tags` and `outputs.labels` from the metadata step. OCI labels (source, revision, version) get embedded in the image — standard hygiene, free with the action.
7. **Notify Watchtower.** Unchanged.

### 3. `Appy/Dockerfile`

Bump base images from .NET 6 to .NET 8 to match the codebase (`Appy.csproj` is `net8.0` since commit `3792682`):

- `mcr.microsoft.com/dotnet/sdk:6.0` → `mcr.microsoft.com/dotnet/sdk:8.0`
- `mcr.microsoft.com/dotnet/aspnet:6.0` → `mcr.microsoft.com/dotnet/aspnet:8.0`

This is a latent bug — the project currently can't actually build with .NET 6 SDK after the upgrade. Fixing it as part of this change because it's adjacent and the release workflow will be exercised on the next release regardless.

## Failure modes

| Scenario | Behaviour |
|---|---|
| Tag format invalid (`v3.3`, `release-3.3.0`, `3.3.0` without `v`) | Validation step fails fast, before any expensive build. Error message tells the user to fix the tag. |
| Image with same version tag already on DockerHub | `docker/build-push-action` overwrites. Acceptable at this project's scale. |
| Watchtower webhook fails (404, network) | Workflow surfaces the error from `curl`; image is still pushed. Manual `docker pull` on the host recovers. Unchanged from today. |

## Out of scope

These are flagged but not done in this change:

- `workflow_dispatch` trigger for manual dry-runs of the workflow.
- Image signing / SLSA provenance / cosign attestations — the next enterprise-correctness step beyond this.
- Bumping the Node version in the Dockerfile (currently Node 16, which is EOL). Angular 16 still supports it; out of scope for this issue.
- Backfilling versioned Docker tags for releases prior to this change.

## Verification

The workflow only runs on `release: published`, so it can only be fully verified by
cutting a real release. Mitigations:

- Manual review of the YAML diff against this spec.
- `act` or `actionlint` for static lint of the workflow file.
- First post-merge release will be a low-risk one (e.g. a patch) so any breakage is contained.

After the next release, verify:

- DockerHub shows `worly/appy:<version>`, `worly/appy:<major.minor>`, `worly/appy:<major>`, `worly/appy:latest` tags all pointing at the same digest.
- `docker image inspect worly/appy:<version>` shows OCI labels including `org.opencontainers.image.version=<version>`.
- Watchtower-managed host picks up the new image as before.
