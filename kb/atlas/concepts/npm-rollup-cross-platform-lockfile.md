---
title: "npm Lockfile Cross-Platform Rollup Bug"
aliases: [rollup-linux, npm-lockfile-windows, rollup-gnu-missing]
tags: [npm, rollup, docker, ci, build, bug, hub]
sources:
  - "calendar/notes/2026-04-21.md"
created: 2026-04-21
updated: 2026-04-21
---

# npm Lockfile Cross-Platform Rollup Bug

When `package-lock.json` is generated on Windows, it does not include the Linux-specific optional dependency `@rollup/rollup-linux-x64-gnu`. Running `npm ci` inside a Linux Docker container then fails because this native binding is absent. This blocks the first CI build for the hub app.

## Key Points

- **Root cause**: npm on Windows omits platform-specific optional packages (like `@rollup/rollup-linux-x64-gnu`) from the lockfile because they are not needed on the host platform.
- **Symptom**: `npm ci` in a Linux container fails with a missing native binding error for rollup.
- **Fix option 1**: Regenerate `package-lock.json` on a Linux machine (or inside a container) so all platform-specific optional deps are captured.
- **Fix option 2**: Change the Dockerfile to use `npm install --include=optional` instead of `npm ci`. This forces npm to resolve and install optional packages for the current platform, bypassing the lockfile's missing entries.
- **Affected service**: `apps/hub` — new `Dockerfile` uses `node:22-slim + COPY vendor/`. The lockfile was generated on Windows (dev machine).

## Details

npm's lockfile format records resolved packages per platform. On Windows, `@rollup/rollup-linux-x64-gnu` is an optional dependency that is never installed, so npm does not include its resolution in `package-lock.json`. When a CI pipeline or Docker build runs `npm ci` on Linux and encounters a `package.json` that lists rollup as a dependency, npm sees the lockfile has no entry for the Linux native binding and errors out.

The `apps/hub/Dockerfile` (added 2026-04-21) uses `node:22-slim` as the base image and copies in the `vendor/` directory from the repo. The `npm ci` vs `npm install --include=optional` decision was left unresolved as of the session end — this is tracked as an open action item for the app team.

This is a known class of cross-platform npm issue that also affects other packages with native bindings (e.g., `esbuild`, `@swc/core`, `better-sqlite3` on some platforms). The safest general fix for Docker-based builds is to always generate the lockfile in the same OS environment as the build target, or to use `--include=optional` at build time.

## Related Concepts

- [[concepts/processa-deploy-topology]] - The CI/CD pipeline that will consume this Dockerfile and lockfile
- [[concepts/github-gitlab-source-divergence]] - The build pipeline history (GHA from GitHub) that preceded the new CI setup

## Sources

- [[calendar/notes/2026-04-21.md]] - Lesson documented: `package-lock.json` on Windows misses `@rollup/rollup-linux-x64-gnu`; fix options (regenerate on Linux or `--include=optional`); listed as open action item for app team
