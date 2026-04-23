---
title: "Deploy-Only CI Pattern Risks"
aliases: [deploy-only-ci, external-ci-risk, stale-image-deploy, ci-source-divergence]
tags: [ci, deploy, gitlab, github, infra, anti-pattern]
sources:
  - "calendar/notes/2026-04-22.md"
created: 2026-04-22
updated: 2026-04-22
---

# Deploy-Only CI Pattern Risks

A "deploy-only" CI pattern separates image building from deployment: one CI system (e.g., GitHub Actions) builds and pushes the image; another (e.g., GitLab CI) only pulls and deploys it. This is fragile when the build CI is not triggered by commits on the actual source-of-truth. If the build CI points to a stale mirror, every deployment silently ships old code.

## Key Points

- **Pattern**: Build CI (external, e.g., GHA on GitHub) builds + pushes image. Deploy CI (GitLab) pulls + deploys image. The two are decoupled.
- **Core risk**: If the build CI is triggered by pushes to a **mirror** (GitHub) rather than the **source-of-truth** (GitLab), and the mirror falls behind, every deploy ships stale code — with no warning.
- **Observed failure**: GHA built from `codrstudio/agentic-backbone` (GitHub mirror), which was 18 days behind `gitlab.processa.info/nic/automacao/nic-lab` (GitLab source-of-truth). Processa's GitLab CI deployed what it believed was the latest image — actually 18-day-old code.
- **Detection**: Compare built HTML asset paths or config fingerprints from the running container against what the source repo would produce. A mismatch confirms the running image is stale.
- **Correct pattern**: Build CI must be triggered by pushes to the canonical source-of-truth. For Processa NIC projects, this means GitLab CI on `nic-lab` does both build and deploy.
- **Registry migration**: Moving from `ghcr.io` (GitHub-pushed) to `registry.processa.info` (GitLab-pushed) was the concrete corrective action; CI vars `DOCKER_REGISTRY_*` in nic-lab were updated to point to the new registry.

## Details

The deploy-only CI pattern is a legitimate approach in some contexts: it separates concerns, allows the deploy side to be simple, and works well when the build CI is reliably triggered by the same source as the deploy CI. The failure mode is specifically when the build and deploy CI systems operate on different remotes without synchronization.

In the agentic-backbone case, the drift went undetected for at least 18 days. The symptom was not a broken deployment — the system continued to run — but a hidden regression: configuration that existed on GitLab was absent from the GitHub mirror, and vice versa. Because the running container showed correct behavior (it was built from GitHub which happened to have the right config), there was no alert. The problem only surfaced when an investigation of the source repos revealed the divergence.

The diagnostic technique for detecting this: `docker exec <container> cat /path/to/built-file` (e.g., reading `index.html` to check asset path prefixes) versus what `vite build` from the repo's current state would produce. If they differ, the running image was built from different code than the current repo state. This is a concrete application of the [[concepts/runtime-source-of-truth]] principle — the container is always authoritative about what is actually running, regardless of what the repo says.

The corrective architecture is: GitLab CI (`nic-lab`) handles both build and deploy. Images are pushed to `registry.processa.info`. No external CI (GitHub Actions) is involved in any production-facing artifact. If GitHub remains as a public mirror, it is explicitly marked read-only with no CI that produces deployable artifacts.

## Related Concepts

- [[concepts/github-gitlab-source-divergence]] - The specific instance of this anti-pattern in the agentic-backbone project
- [[concepts/runtime-source-of-truth]] - How to detect that a running image is stale vs the source repo
- [[concepts/gitlab-ci-variable-patterns]] - The GitLab CI variables that enable the correct build+deploy pattern

## Sources

- [[calendar/notes/2026-04-22.md]] - Session (13:21): deploy-only CI anti-pattern documented; observed failure (GHA on GitHub mirror 18 days stale); detection method (compare built HTML asset paths); correct pattern is GitLab CI doing both build and deploy on nic-lab
