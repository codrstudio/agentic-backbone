---
title: "GitLab CI Variable Patterns (Processa / nic-lab)"
aliases: [gitlab-vars, ci-variables, gitlab-masking, project-level-vars]
tags: [gitlab, ci, deploy, secrets, processa, nic-lab]
sources:
  - "calendar/notes/2026-04-21.md"
created: 2026-04-21
updated: 2026-04-21
---

# GitLab CI Variable Patterns (Processa / nic-lab)

The CI/CD variables for agentic-backbone deployments live at project level in `nic-lab` (GitLab project id 275), not at group level. Variable naming follows a vendor-neutral convention (`DOCKER_REGISTRY_*`) enforced after discovering that an earlier convention (`DOCKER_CODR_*`) embedded a supplier brand name in a client's infrastructure. Masking is constrained by GitLab's character allowlist.

## Key Points

- **Scope**: Variables are project-level in `nic-lab` (id 275). Group-level vars were checked and found empty — any assumption of group inheritance is wrong.
- **Canonical registry vars**: `DOCKER_REGISTRY_URL`, `DOCKER_REGISTRY_USER`, `DOCKER_REGISTRY_PASSWORD` (renamed from `DOCKER_CODR_*` on 2026-04-21).
- **SSH key**: `DOCKER_REGISTRY_*` are paired with `SSH_DEPLOY_KEY` declared as **file** type in GitLab CI settings (not a regular variable) — this avoids newline escaping issues with PEM keys.
- **Infrastructure constants**: `VPS_IAWEB_*` (host, port, user) are hardcoded in the `.gitlab-ci.yml` `variables:` block, not in project settings — they are non-secret deployment parameters.
- **Masking constraint**: GitLab only accepts `masked: true` for values whose characters are in `[a-zA-Z0-9@_+=:/-]`. Values containing `#` (e.g. htpasswd passwords) will fail with `{"message":{"value":["is invalid"]}}`. Workaround: use `masked: false` + `--password-stdin` in the CI script to avoid the secret appearing in logs without relying on GitLab masking.

## Details

GitLab's variable masking feature protects secrets by replacing them in CI job logs. However, the mask engine requires the value to be expressible in a base64-safe character set. Many htpasswd-generated passwords include `#`, `$`, or other special characters that fall outside this set. When a project tries to create a masked variable with such a value via the API, GitLab returns a 422 with `{"message":{"value":["is invalid"]}}`. The practical workaround is to pass the password via stdin (`echo "$PASS" | docker login --password-stdin`) which prevents it from appearing as a command-line argument in shell logs, providing equivalent protection without requiring GitLab masking.

An important naming principle emerged from this session: variables stored in a **client's** GitLab project must use vendor-neutral names. The skill prescribes `DOCKER_REGISTRY_URL/USER/PASSWORD` as canonical names precisely so that they can be used across any deployment context without embedding a supplier's brand. A vendor's identity may appear in the **value** of `DOCKER_REGISTRY_URL` (e.g. `registry.processa.info`), but never in the variable name itself. The earlier `DOCKER_CODR_*` naming was discovered and corrected in a coordinated rename during the 2026-04-21 session.

Masked variable values cannot be read back via the GitLab API — the API returns `<hidden>` for masked values. This means backup/recovery requires accessing the password through an out-of-band channel (htpasswd file, password manager), not via the API.

## Related Concepts

- [[concepts/client-infra-vendor-naming]] - The naming convention principle that drove the `DOCKER_CODR_*` → `DOCKER_REGISTRY_*` rename
- [[concepts/processa-deploy-topology]] - The deployment pipeline that consumes these CI variables
- [[concepts/github-gitlab-source-divergence]] - The GitLab project (`nic-lab` id 275) that is the source-of-truth for builds

## Sources

- [[calendar/notes/2026-04-21.md]] - Session (21:00): project-level vars confirmed in nic-lab id 275; `DOCKER_CODR_*` renamed to `DOCKER_REGISTRY_*`; masking rejected for `#`-containing passwords; `SSH_DEPLOY_KEY` as file type; `VPS_IAWEB_*` hardcoded in yml
