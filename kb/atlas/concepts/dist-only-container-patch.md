---
title: "Emergency Patch Pattern for Dist-Only Containers"
aliases: [dist-only-patch, container-hotpatch, compiled-container-patch]
tags: [deploy, docker, debugging, emergency, prod]
sources:
  - "calendar/notes/2026-04-22.md"
created: 2026-04-22
updated: 2026-04-22
---

# Emergency Patch Pattern for Dist-Only Containers

When a production container runs a pre-compiled dist (no source files mounted), small targeted fixes can be applied directly to the compiled JS without waiting for a CI pipeline rebuild.

## When It Applies

- Container has no source files (`docker exec <c> ls /app/src` → empty or not found).
- The bug is well-localized — a single line/expression change, not a structural refactor.
- The fix is already merged in the source repo; you're only accelerating its deployment.
- CI pipeline is slow or has failed and the fix is urgent.

## Procedure

1. **Verify the source is not present**:
   ```bash
   docker exec <container> ls /app/apps/backbone/src 2>/dev/null || echo "NO_SRC"
   ```

2. **Locate the compiled file**:
   ```bash
   docker exec <container> grep -rl "old_expression" /app/apps/backbone/dist/
   ```

3. **Apply the patch with `sed`**:
   ```bash
   docker exec <container> sed -i \
     's/old_expression/new_expression/' \
     /app/apps/backbone/dist/routes/auth.js
   ```

4. **Verify the patch was applied**:
   ```bash
   docker exec <container> grep -A3 "context_around_change" /app/apps/backbone/dist/routes/auth.js
   ```

5. **Restart the container** (to reload JS — Node.js caches modules in memory):
   ```bash
   cd /projetos/<app> && docker compose --env-file .env -f infra/docker-compose.yml restart <service>
   ```

## Caveats

- **Ephemeral**: the patch lives in the container's writable layer. Next image rebuild/redeploy overwrites it. This is intentional — next CI deploy will bring the real fix.
- **Not for structural changes**: if the fix requires new imports, new functions, or restructuring, it's not safe to sed — do a proper build instead.
- **Document the patch**: note that a hotpatch was applied so the team knows the dist diverges from the image layer until the next deploy.

## Finding the Compose File for Restart

When the compose file location is unknown, inspect the container's labels:
```bash
docker inspect <container> --format \
  "{{index .Config.Labels \"com.docker.compose.project.config_files\"}}"
```

This returns the exact compose file path used to start the container.

## Env File Requirement

`docker compose restart` may fail with "variable not set" warnings if the shell doesn't have the env vars. Always pass `--env-file`:
```bash
docker compose --env-file .env -f infra/docker-compose.yml restart <service>
```

## Related Concepts

- [[concepts/runtime-source-of-truth]] - The broader principle of inspecting runtime state before acting
- [[concepts/deploy-only-ci-pattern-risks]] - Why CI pipelines can be slow or stale, making hotpatches necessary

## Sources

- [[calendar/notes/2026-04-22.md]] - Session (22:00): bootstrap mode fix applied via `sed` to compiled `auth.js` inside `ab-development-backbone-1`; restart confirmed with 5s wait + log check
