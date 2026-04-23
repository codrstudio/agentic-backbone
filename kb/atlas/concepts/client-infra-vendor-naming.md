---
title: "Client Infrastructure Vendor Naming Convention"
aliases: [vendor-naming, ci-var-naming, client-infra-naming]
tags: [ci, naming, conventions, infra, gitlab, deploy]
sources:
  - "calendar/notes/2026-04-21.md"
created: 2026-04-21
updated: 2026-04-21
---

# Client Infrastructure Vendor Naming Convention

Variables, secrets, and configuration entries stored in a client's infrastructure must use vendor-neutral names. Embedding a supplier's brand or acronym in a variable name contaminates the client's GitLab project, CI pipelines, and documentation with a dependency on that supplier's identity — even if the supplier changes or the variable is repurposed.

## Key Points

- **Rule**: Variable names in client infra must be generic and role-based (e.g. `DOCKER_REGISTRY_URL`, `DOCKER_REGISTRY_USER`). Vendor identity belongs in the **value**, not the **name**.
- **Violation pattern**: `DOCKER_CODR_URL`, `DOCKER_CODR_USER`, `DOCKER_CODR_PASSWORD` — `CODR` is the supplier brand (CODR Studio), embedded in a variable name in the client's (Processa) GitLab.
- **Correct pattern**: `DOCKER_REGISTRY_URL` = `registry.processa.info` — the supplier's identity is absent from the name; the value reflects the actual endpoint.
- **Skill responsibility**: If a deployment skill prescribes canonical variable names (e.g. `DOCKER_REGISTRY_*`), implementations in client infra must follow those names exactly. Deviating to `DOCKER_{VENDOR}_*` is an implementation error, not a customization.
- **Corrective action**: Rename variables via the GitLab CI/CD settings UI or API. Any `.gitlab-ci.yml` or scripts referencing the old names must be updated atomically in the same change.

## Details

The principle emerges from a practical concern: a client's infrastructure should be portable and free of supplier lock-in at the naming level. If the supplier name appears in variable names, renaming or replacing the supplier requires changes in the client's own GitLab settings and CI files — work that falls on the client rather than being isolated to the supplier's configuration. By contrast, if the variable name is neutral (`DOCKER_REGISTRY_URL`) and the supplier identity lives only in the value, switching registries requires only updating the value — the CI pipeline and scripts remain unchanged.

A secondary concern is documentation and auditability: a client reading their own CI configuration should not need knowledge of a supplier's internal branding to understand what a variable does. `DOCKER_REGISTRY_URL` is self-explanatory; `DOCKER_CODR_URL` requires knowing what "CODR" refers to.

This principle extends beyond registry credentials: SSH key variable names (`SSH_DEPLOY_KEY` rather than `SSH_CODR_KEY`), API token names, and any other supplier-managed credential stored in client infra should follow the same convention. The exception is values: `registry.codrstudio.dev` as the URL value for `DOCKER_REGISTRY_URL` is perfectly acceptable because the value is a factual address, not an identifier that propagates into code.

## Related Concepts

- [[concepts/gitlab-ci-variable-patterns]] - The specific GitLab variable setup where this convention was applied
- [[concepts/processa-deploy-topology]] - The client infra (Processa) where the naming violation was corrected

## Sources

- [[calendar/notes/2026-04-21.md]] - Session (21:00): `DOCKER_CODR_*` identified as vendor-brand contamination in client's GitLab; renamed to `DOCKER_REGISTRY_*`; principle documented: vendor in value OK, vendor in name not OK
