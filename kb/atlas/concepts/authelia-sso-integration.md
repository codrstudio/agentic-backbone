---
title: "Authelia SSO Integration Pattern (Agentic Backbone)"
aliases: [authelia-sso, sso-integration, hybrid-auth]
tags: [auth, sso, authelia, jwt, cookie, bootstrap]
sources:
  - "calendar/notes/2026-04-22.md"
created: 2026-04-22
updated: 2026-04-22
---

# Authelia SSO Integration Pattern (Agentic Backbone)

Hybrid authentication: under Authelia (production) → auto-login via injected headers; without Authelia (dev) → manual login form. The two paths share the same JWT cookie infrastructure.

## Key Points

- **Authelia injects 4 headers** via nginx `auth_request_set` into every authenticated request: `Remote-User`, `Remote-Email`, `Remote-Name`, `Remote-Groups`.
- **`POST /auth/sso`**: reads `Remote-User` header; if absent → 401 ("not under authelia"). Creates or updates user, emits JWT as HttpOnly cookie (`path=/api`, 24h).
- **HttpOnly cookie**: token never touches localStorage. All requests use `credentials: "include"`. SSE and EventSource also include the cookie automatically.
- **Hub `beforeLoad`**: tries `checkAuth()` first (existing cookie); if fails → tries `loginWithSSO()`; if that fails → redirect to `/login`. This gives hybrid behavior transparently.
- **`upsertSSOUser`**: creates `context/users/{slug}/USER.md` on first login, without `credential.yml`. On subsequent logins, updates `displayName` and `email` only.
- **SSO flag**: `userHasCredential(slug)` checks if `credential.yml` exists. If not (and not `system`) → `sso: true` in API responses. UI uses this to hide password-change button and show SSO badge.

## Bootstrap Mode

When no non-system user has `role: sysadmin`, every SSO login gets sysuser automatically. This solves the chicken-and-egg problem of first-time admin configuration without LDAP groups.

**Critical exclusion**: `system` user has `role: sysadmin` in its USER.md (used for dev login without Authelia). The bootstrap check **must** exclude it:

```ts
const bootstrapMode = !listUsers().some(
  (u) => u.slug !== "system" && u.role === "sysadmin"
);
```

Without the `u.slug !== "system"` guard, bootstrap mode is always false in production, and the first real SSO user gets `user` role instead of sysuser.

## Flow

```
nginx (auth_request → Authelia) → app container
  → Remote-User/Email/Name headers injected
  → POST /auth/sso
    → upsertSSOUser (create/update USER.md)
    → bootstrap check (any non-system sysadmin?)
    → createAuthToken(slug, effectiveRole)
    → HttpOnly cookie set
    → return { user: { id, role, displayName } }
```

## Same Bug Exists in Frontend

The `BootstrapBanner` in `users-list.tsx` had the same exclusion bug — it computed bootstrap mode from the users list without excluding `system`. Both backend and frontend must apply the `slug !== "system"` guard.

## Related Concepts

- [[concepts/processa-deploy-topology]] - nginx-proxy + Authelia topology where headers originate
- [[concepts/bootstrap-mode-system-exclusion]] - The general pattern of excluding technical users from admin counting

## Sources

- [[calendar/notes/2026-04-22.md]] - Session (22:00): full implementation, production validation via Playwright; bootstrap mode bug found and fixed in prod via emergency dist patch
