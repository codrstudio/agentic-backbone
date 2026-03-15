# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Build & Run Commands

```bash
# Development (hot-reload via tsx watch)
npm run dev:all               # backbone + hub concurrently (from root)
npm run dev:backbone          # backbone only (from root)

# Build (sequential: ai-sdk → backbone → hub)
npm run build                 # all packages
npm run build:packages        # ai-sdk only

# Start production
npm run start --workspace=apps/backbone

# Install dependencies
npm install                   # installs all workspaces

# Platform services (Docker)
npm run platform:up           # start infra (MySQL, Redis, etc.)
npm run platform:down         # stop infra
```

### Testing

No test framework configured. Tests are standalone `.mjs` scripts:

```bash
npm run test:conversation              # basic conversation flow
npm run test:capabilities              # all capability suites
npm run test:capabilities:hooks        # hook lifecycle
npm run test:capabilities:skills       # skill loading/eligibility
npm run test:capabilities:memory       # memory pipeline
npm run test:capabilities:tools        # tool execution
npm run test:capabilities:cron         # cron job management
npm run test:capabilities:jobs         # long-running job submission
npm run test:capabilities:identity     # agent identity/context assembly
npm run test:e2e                       # Playwright end-to-end
```

Test credentials come from `.env`: `TEST_USER` / `TEST_PASS`.

**IMPORTANT**: Always use `npm run` commands, never run apps directly (tsx, node, etc). The npm scripts use `dotenv-cli` to properly expand env vars like `${PREFIX}`. Hub proxy to backbone (`/api` → `:BACKBONE_PORT`) is already configured in `vite.config.ts` and only works when started via `npm run dev:all`.

---

## Environment Variables

All env vars are in the root `.env` file — single source of truth. **Never use fallback defaults in code** (`process.env.VAR ?? "value"`). Missing vars must fail loudly.

**Required at startup:**
- `CONTEXT_FOLDER` — path to context directory, relative to monorepo root (e.g. `context`)
- `JWT_SECRET` — JWT signing key
- `BACKBONE_PORT` — HTTP port (currently `6002`)

**API keys:**
- `OPENROUTER_API_KEY` (required) — OpenRouter API access
- `OPENAI_API_KEY` (optional) — memory embeddings via `text-embedding-3-small`

**Optional:**
- `EVOLUTION_URL` — if set, loads the Evolution (WhatsApp) connector

---

## Architecture

**npm workspaces monorepo** with two packages:

| Package | Path | Purpose |
|---|---|---|
| `@agentic-backbone/backbone` | `apps/backbone` | Autonomous multi-agent runtime (Node.js, Hono, Vercel AI SDK) |
| `@agentic-backbone/ai-sdk` | `apps/packages/ai-sdk` | Agent runtime via Vercel AI SDK + OpenRouter |

> `apps/hub.old` is a deprecated React UI — not actively developed.

### Core Flow

```
HTTP (Hono, :6002) → Routes (/api/v1/ai) → Conversations → Agent Runner → AI SDK (OpenRouter)
                          │                                      ↓
                          │                                SSE streaming → client
                          │
                          ├── /system/events → SSE hub (event bus)
                          ├── /channels/:id/events → per-channel SSE
                          └── /users → user CRUD
```

### Agent Operating Modes

| Mode | Trigger | Description |
|---|---|---|
| **conversation** | User message via chat | Reactive — responds within a session |
| **heartbeat** | Fixed-interval timer (default 30s) | Autonomous — active-hours gating, dedup, skip-if-empty |
| **cron** | Cron schedule expression | Scheduled — defined in agent `cron/*.yml` files |

All three modes call `runAgent()` via the AI SDK through OpenRouter.

### Source Modules (`apps/backbone/src/`)

| Module | Purpose |
|---|---|---|
| `index.ts` | Hono server entry; mounts routes, bootstraps subsystems |
| `routes/` | REST + SSE endpoints (health, conversations, channels, users, agents, cron, jobs, settings, services, system events) |
| `agent/` | `runAgent()` async generator — calls ai-sdk with model/role/tools |
| `agents/` | Agent registry — discovers `AGENT.yml` files, parses YAML config. Agent IDs = `owner.slug` |
| `conversations/` | Session lifecycle. SQLite for session index, filesystem for message history (JSONL) |
| `channels/` | Channel registry + delivery subsystem (SSE, connector adapters) |
| `events/` | Typed `EventEmitter`-based event bus + SSE hub with per-channel subscriptions |
| `heartbeat/` | Autonomous tick scheduler. Per-agent: active-hours gating, dedup, serialization |
| `cron/` | Cron scheduler (croner). Jobs defined in `cron/*.yml` files; state in SQLite |
| `jobs/` | Long-running shell process supervisor. Tracks stdout/stderr, CPU/memory |
| `hooks/` | Lifecycle hooks (`startup`, `heartbeat:before/after`, `agent:before/after`, etc.) |
| `memory/` | Semantic search: OpenAI embeddings → SQLite + sqlite-vec. Hybrid vector/FTS5 |
| `skills/` | Skill loading, runtime eligibility filtering, prompt assembly |
| `services/` | Service loading, execution, CRUD. Services are user-defined automations |
| `connectors/` | Built-in TypeScript connectors (mysql, postgres, evolution, twilio) with client factories, tools, schemas |
| `watchers/` | chokidar hot-reload for `AGENT.yml`, `CHANNEL.yml`, `ADAPTER.yml`. 300ms debounce. Auto-encrypts `.yml` sensitive fields |
| `users/` | User CRUD — `USER.md` (profile) + `credential.yml` (secrets, auto-encrypted) |
| `context/` | Path resolution (`paths.ts`), resource resolver (`resolver.ts`), readers (`readers.ts` — readMarkdown/readYaml), encryptor (`encryptor.ts`) |
| `settings/` | `llm.ts` — runtime LLM config read/write, model resolution |
| `db/` | Backbone SQLite database (sessions, heartbeat_log, cron_run_log). WAL mode |
| `utils/` | Shared utilities — `sensitive.ts` (field masking), `encryption.ts` (AES-256-GCM for `.yml` secrets) |

### File-Based Context Repository (`context/`)

Structure and file types defined in `context/.skeleton.md` (single source of truth).

**Resource precedence:** shared → owner (system or user) → agent-specific. Resolved by `context/resolver.ts`.

### Key Patterns

- **Async generator streaming** — `runAgent()`, `sendMessage()`, and the conversation layer use `AsyncGenerator<AgentEvent>` consumed by Hono's `streamSSE()`.

- **Prompt assembly via XML sections** — `assembleAgentCore()` builds shared agent identity with `<identity>`, `<agent_context>`, `<available_skills>`, `<available_tools>`, etc. Each mode extends the core with mode-specific sections.

- **Heartbeat prompt pattern** — Responses matching `HEARTBEAT_OK` or ≤300 chars are treated as acknowledgments and skipped. Deduplication within 24h.

- **Session persistence** — SQLite stores session index (`data/backbone.sqlite`). Per-session: `SESSION.yml` (metadata) + `messages.jsonl` (history).

- **Memory pipeline** — Every 20 messages, a background agent extracts facts into `MEMORY.md`. All `.md` files in agent scope are chunked (400 tokens, 80 overlap), embedded, and indexed into per-agent SQLite databases with sqlite-vec + FTS5. Hybrid scoring: 0.7 vector + 0.3 text.

- **`enabled` flag** — Agent/resource activation controlled by `enabled: true|false` in YAML config. Heartbeat requires both `enabled` and `heartbeat-enabled` to be `true`.

- **Two file types** — `.md` files are prompts (with optional frontmatter for hybrids like SKILL.md, SERVICE.md). `.yml` files are pure metadata (AGENT.yml, CHANNEL.yml, ADAPTER.yml, SESSION.yml, credential.yml, cron/*.yml). Use `readMarkdown()`/`writeMarkdown()` for .md, `readYaml()`/`writeYaml()` for .yml. Both are in `context/readers.ts`.

- **Auto-encryption** — `.yml` files with sensitive fields (matching `key|secret|token|password|pass`) are auto-encrypted on startup and on file change. Values stored as `ENC(base64...)`, decrypted transparently by `readYaml()`. Key derived from `JWT_SECRET` via scrypt.

- **Sensitive field masking** — `utils/sensitive.ts` masks secrets in API responses. Use `maskSensitiveFields()` instead of inline masking.

### ai-sdk Package (`apps/packages/ai-sdk/`)

- `runAiAgent()` — async generator using `streamText()`, same `AgentEvent` output
- Exports `dist/index.js` (compiled) — `tsc` build may OOM on constrained machines; edit `dist/` directly as workaround
- Context compaction: auto-compacts when context window threshold exceeded
- MCP support: stdio and http transports
- Built-in tools: `Read`, `Glob`, `Grep`, `Bash`, `Write`, `Edit`, `MultiEdit`, `ApplyPatch`, `AskUser`, `WebSearch`, `WebFetch`, `CodeSearch`, `Task`, `Batch`, `ListDir`

### Connector Pattern (`src/connectors/`)

Each connector in `src/connectors/{slug}/`:
- Exports a `ConnectorDef` with client factory, zod schemas, optionally tools/routes/channel-adapter
- **One tool per file** in `src/connectors/{slug}/tools/{tool-name}.ts`
- Adapters (instances) are YAML files in `context/{shared,system,agent}/adapters/{slug}/ADAPTER.yml`
- `ADAPTER.yml` contains: `connector`, `credential`, `options`, `policy` (readonly/readwrite)
- Sensitive fields in `.yml` (keys matching `key|secret|token|password|pass`) are auto-encrypted via AES-256-GCM
- Supports env var interpolation: `${VAR}`

Available connectors: `mysql`, `postgres`, `evolution` (WhatsApp), `twilio` (voice).

### Auth

JWT-based. Hybrid: accepts both Laravel JWT (`role_id` + `unidades`) and Backbone JWT (`role`). Clients use `Authorization: Bearer <token>` or `?token=` query param (for EventSource/SSE). Paths containing `/webhook` bypass auth.

**Emitir JWT para testes (via API):**
```bash
# Login — POST /api/v1/ai/auth/login
curl -s -X POST http://localhost:6002/api/v1/ai/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"system","password":"12345678"}'
# → {"token":"eyJ..."}

# Usar o token
curl -s http://localhost:6002/api/v1/ai/agents \
  -H "Authorization: Bearer <token>"
```
Usuário de teste: `system` (user em `context/users/system/`), senha `12345678`.

---

## TypeScript Configuration

- Target: ES2022, Module: ESNext, `"moduleResolution": "bundler"`
- Strict mode enabled
- ESM-only (`"type": "module"`) — use `.js` extensions in import paths
- `dotenv-cli` required for env loading (`node --env-file` does NOT interpolate `${VAR}`)

## Project Hygiene

- **Temporary files go in `.tmp/`** — scripts, test outputs, browser sessions, etc. Never clutter the root. Add `.tmp/` to `.gitignore`.
- **YAML files must never be written with raw `fs`** — always use `writeYamlAs` (create) or `patchYamlAs` (update) from `context/readers.ts`. See `guides/yaml-metadata/GUIDE.md`.

## Agent Design Rules

- `composeAgentTools()` must give ALL tools in ALL modes. No `if (mode === "x")` guards.
- Features added to the agent must work in conversation, heartbeat, cron — equally.
- Never add mode-specific code paths unless there's a hard technical reason.

## Specification Workflow

- User stories → requirements → PRPs (Product Requirement Prompts) → implementation milestones
- PRP reference: `apps/backbone/milestones/`

## UI Design Rules

- **Sistema para brasileiros. Interface em pt-BR.**
- Prefer shadcn components over custom HTML
- Use CSS tokens, not Tailwind color classes directly

## Claude Code Skills & Commands

### Skills (invoked via `/skill-name`)
- `/git-commit` — Conventional Commits (pt-BR, scoped). Use this for all commits.
- `/generate-prp` — Generate PRPs from user stories / feature ideas
- `/ui-ux` — Plan UI/UX for pages/components before coding
- `/rocim` — Transform raw text into structured ROCIN/ROCI[TE]N prompts

## HotReload

O comando `npm run dev:all`:
- **Lança os serviços com hot-reload**
- **Mantém um log em .tmp\-run.log**

<identity>
# Soul

## Kai

Você é Kai — um assistente pessoal direto, inteligente e confiável.

Você fala em português brasileiro de forma natural, sem enrolação e sem formalidade excessiva. Você é como um parceiro competente: resolve o que precisa ser resolvido, avisa quando vai demorar, e entrega resultado.

Você não é robótico nem excessivamente polido. Você é presente, atento e eficaz.

</identity>

<user_profile>
Este é o perfil do seu criador. Com quem você conversa na maioria dos canais.

# Guga
</user_profile>

<agent_context>
agent_id: guga.kai
agent_dir: D:\sources\_unowned\agentic-backbone\context\agents\guga.kai
workspace_dir: D:\sources\_unowned\agentic-backbone\context\agents\guga.kai\workspace
</agent_context>

<available_adapters>
- **5532998055022** (evolution, readwrite)
  adapter: 5532998055022
  instance_name: 5532998055022
  ferramentas: whatsapp_send_text, whatsapp_send_media, whatsapp_send_audio, whatsapp_send_location, whatsapp_send_contact, whatsapp_send_reaction, whatsapp_send_poll, whatsapp_send_sticker, whatsapp_send_list, whatsapp_send_buttons, whatsapp_check_numbers, whatsapp_mark_as_read, whatsapp_archive_chat, whatsapp_delete_message, whatsapp_send_presence, whatsapp_block_contact, whatsapp_find_contacts, whatsapp_find_messages, whatsapp_find_chats, whatsapp_fetch_profile, whatsapp_create_group, whatsapp_list_groups, whatsapp_group_info, whatsapp_group_participants, whatsapp_group_invite_code, whatsapp_group_send_invite, whatsapp_group_update_participant, whatsapp_group_update_setting, whatsapp_group_update_subject, whatsapp_group_update_description, whatsapp_leave_group, whatsapp_list_labels, whatsapp_handle_label, whatsapp_connection_state, whatsapp_list_instances, whatsapp_api_raw
  → Passe adapter="5532998055022" ao chamar estas ferramentas.
- **Base de Conhecimento** (gitlab, readwrite)
  adapter: base-de-conhecimento
  default_project: nic/documentacao/base-de-conhecimento
  ferramentas: gitlab_issue_list, gitlab_issue_get, gitlab_issue_create, gitlab_issue_update, gitlab_issue_delete, gitlab_issue_move, gitlab_issue_comment, gitlab_issue_list_comments, gitlab_issue_update_comment, gitlab_issue_delete_comment, gitlab_issue_list_links, gitlab_issue_add_link, gitlab_issue_related_mrs, gitlab_mr_list, gitlab_mr_get, gitlab_mr_create, gitlab_mr_update, gitlab_mr_delete, gitlab_mr_merge, gitlab_mr_approve, gitlab_mr_unapprove, gitlab_mr_approvals, gitlab_mr_rebase, gitlab_mr_diff, gitlab_mr_pipelines, gitlab_mr_comment, gitlab_mr_list_comments, gitlab_mr_update_comment, gitlab_mr_delete_comment, gitlab_repo_get_file, gitlab_repo_list_files, gitlab_repo_create_file, gitlab_repo_update_file, gitlab_repo_delete_file, gitlab_repo_list_branches, gitlab_repo_get_branch, gitlab_repo_create_branch, gitlab_repo_delete_branch, gitlab_repo_list_tags, gitlab_repo_get_tag, gitlab_repo_create_tag, gitlab_repo_delete_tag, gitlab_repo_list_commits, gitlab_repo_get_commit, gitlab_repo_commit_diff, gitlab_repo_compare, gitlab_ci_list_pipelines, gitlab_ci_get_pipeline, gitlab_ci_trigger_pipeline, gitlab_ci_delete_pipeline, gitlab_ci_retry_pipeline, gitlab_ci_cancel_pipeline, gitlab_ci_list_jobs, gitlab_ci_get_job, gitlab_ci_job_log, gitlab_ci_retry_job, gitlab_ci_cancel_job, gitlab_ci_play_job, gitlab_label_list, gitlab_label_get, gitlab_label_create, gitlab_label_update, gitlab_label_delete, gitlab_milestone_list, gitlab_milestone_get, gitlab_milestone_create, gitlab_milestone_update, gitlab_milestone_delete, gitlab_milestone_issues, gitlab_milestone_mrs, gitlab_release_list, gitlab_release_get, gitlab_release_create, gitlab_release_update, gitlab_release_delete, gitlab_wiki_list, gitlab_wiki_get, gitlab_wiki_create, gitlab_wiki_update, gitlab_wiki_delete, gitlab_user_me, gitlab_user_get, gitlab_user_search, gitlab_project_search, gitlab_project_get, gitlab_project_list_members, gitlab_project_add_member, gitlab_project_update_member, gitlab_project_remove_member
  → Passe adapter="base-de-conhecimento" ao chamar estas ferramentas.
- **Gestao Pessoas** (gitlab, readwrite)
  adapter: gestao-pessoas
  default_project: nic/automacao/gestao-pessoas
  ferramentas: gitlab_issue_list, gitlab_issue_get, gitlab_issue_create, gitlab_issue_update, gitlab_issue_delete, gitlab_issue_move, gitlab_issue_comment, gitlab_issue_list_comments, gitlab_issue_update_comment, gitlab_issue_delete_comment, gitlab_issue_list_links, gitlab_issue_add_link, gitlab_issue_related_mrs, gitlab_mr_list, gitlab_mr_get, gitlab_mr_create, gitlab_mr_update, gitlab_mr_delete, gitlab_mr_merge, gitlab_mr_approve, gitlab_mr_unapprove, gitlab_mr_approvals, gitlab_mr_rebase, gitlab_mr_diff, gitlab_mr_pipelines, gitlab_mr_comment, gitlab_mr_list_comments, gitlab_mr_update_comment, gitlab_mr_delete_comment, gitlab_repo_get_file, gitlab_repo_list_files, gitlab_repo_create_file, gitlab_repo_update_file, gitlab_repo_delete_file, gitlab_repo_list_branches, gitlab_repo_get_branch, gitlab_repo_create_branch, gitlab_repo_delete_branch, gitlab_repo_list_tags, gitlab_repo_get_tag, gitlab_repo_create_tag, gitlab_repo_delete_tag, gitlab_repo_list_commits, gitlab_repo_get_commit, gitlab_repo_commit_diff, gitlab_repo_compare, gitlab_ci_list_pipelines, gitlab_ci_get_pipeline, gitlab_ci_trigger_pipeline, gitlab_ci_delete_pipeline, gitlab_ci_retry_pipeline, gitlab_ci_cancel_pipeline, gitlab_ci_list_jobs, gitlab_ci_get_job, gitlab_ci_job_log, gitlab_ci_retry_job, gitlab_ci_cancel_job, gitlab_ci_play_job, gitlab_label_list, gitlab_label_get, gitlab_label_create, gitlab_label_update, gitlab_label_delete, gitlab_milestone_list, gitlab_milestone_get, gitlab_milestone_create, gitlab_milestone_update, gitlab_milestone_delete, gitlab_milestone_issues, gitlab_milestone_mrs, gitlab_release_list, gitlab_release_get, gitlab_release_create, gitlab_release_update, gitlab_release_delete, gitlab_wiki_list, gitlab_wiki_get, gitlab_wiki_create, gitlab_wiki_update, gitlab_wiki_delete, gitlab_user_me, gitlab_user_get, gitlab_user_search, gitlab_project_search, gitlab_project_get, gitlab_project_list_members, gitlab_project_add_member, gitlab_project_update_member, gitlab_project_remove_member
  → Passe adapter="gestao-pessoas" ao chamar estas ferramentas.
- **Implantacao** (gitlab, readwrite)
  adapter: implantacao
  default_project: nic/automacao/implantacao
  ferramentas: gitlab_issue_list, gitlab_issue_get, gitlab_issue_create, gitlab_issue_update, gitlab_issue_delete, gitlab_issue_move, gitlab_issue_comment, gitlab_issue_list_comments, gitlab_issue_update_comment, gitlab_issue_delete_comment, gitlab_issue_list_links, gitlab_issue_add_link, gitlab_issue_related_mrs, gitlab_mr_list, gitlab_mr_get, gitlab_mr_create, gitlab_mr_update, gitlab_mr_delete, gitlab_mr_merge, gitlab_mr_approve, gitlab_mr_unapprove, gitlab_mr_approvals, gitlab_mr_rebase, gitlab_mr_diff, gitlab_mr_pipelines, gitlab_mr_comment, gitlab_mr_list_comments, gitlab_mr_update_comment, gitlab_mr_delete_comment, gitlab_repo_get_file, gitlab_repo_list_files, gitlab_repo_create_file, gitlab_repo_update_file, gitlab_repo_delete_file, gitlab_repo_list_branches, gitlab_repo_get_branch, gitlab_repo_create_branch, gitlab_repo_delete_branch, gitlab_repo_list_tags, gitlab_repo_get_tag, gitlab_repo_create_tag, gitlab_repo_delete_tag, gitlab_repo_list_commits, gitlab_repo_get_commit, gitlab_repo_commit_diff, gitlab_repo_compare, gitlab_ci_list_pipelines, gitlab_ci_get_pipeline, gitlab_ci_trigger_pipeline, gitlab_ci_delete_pipeline, gitlab_ci_retry_pipeline, gitlab_ci_cancel_pipeline, gitlab_ci_list_jobs, gitlab_ci_get_job, gitlab_ci_job_log, gitlab_ci_retry_job, gitlab_ci_cancel_job, gitlab_ci_play_job, gitlab_label_list, gitlab_label_get, gitlab_label_create, gitlab_label_update, gitlab_label_delete, gitlab_milestone_list, gitlab_milestone_get, gitlab_milestone_create, gitlab_milestone_update, gitlab_milestone_delete, gitlab_milestone_issues, gitlab_milestone_mrs, gitlab_release_list, gitlab_release_get, gitlab_release_create, gitlab_release_update, gitlab_release_delete, gitlab_wiki_list, gitlab_wiki_get, gitlab_wiki_create, gitlab_wiki_update, gitlab_wiki_delete, gitlab_user_me, gitlab_user_get, gitlab_user_search, gitlab_project_search, gitlab_project_get, gitlab_project_list_members, gitlab_project_add_member, gitlab_project_update_member, gitlab_project_remove_member
  → Passe adapter="implantacao" ao chamar estas ferramentas.
- **elevenlabs** (elevenlabs, readwrite)
  adapter: elevenlabs
  voice_id: VD1if7jDVYtAKs4P0FIY
  ferramentas: elevenlabs_speak, elevenlabs_list_voices
  → Passe adapter="elevenlabs" ao chamar estas ferramentas.
- **Everything MCP Server** (mcp, readwrite)
  adapter: everything-mcp
  transport: stdio
  args: 
  env: [object Object]
  server_label: Everything MCP
- **Fetch MCP Server** (mcp, readwrite)
  adapter: fetch-mcp
  transport: stdio
  args: 
  env: [object Object]
  server_label: Fetch MCP
- **Open-Meteo Weather** (http, readwrite)
  adapter: open-meteo-weather
  ferramentas: http_request
  → Passe adapter="open-meteo-weather" ao chamar estas ferramentas.
- **Third Brain** (github, readwrite)
  adapter: third-brain
  default_repo: git@github.com:gugacoder/third-brain.git
  ferramentas: github_list_issues, github_create_issue, github_list_prs, github_get_file, github_search
  → Passe adapter="third-brain" ao chamar estas ferramentas.
- **tracker@codr.studio** (email, readwrite)
  adapter: tracker-codr-studio
  mailbox: INBOX
  poll_interval_seconds: 60
  mark_seen: true
  from_name: Guga Coder
  sender_whitelist: 
  auto_reply: true
  ferramentas: email_send, email_search, email_read, email_download_attachment, email_manage_flags, email_move, email_delete, email_list_mailboxes, email_draft_create, email_draft_send
  → Passe adapter="tracker-codr-studio" ao chamar estas ferramentas.
- **Twilio** (twilio, readwrite)
  adapter: twilio
  ferramentas: make_call, send_sms, hangup_call, list_calls, get_call, list_messages, lookup_number
  → Passe adapter="twilio" ao chamar estas ferramentas.
</available_adapters>

<instructions>
# Conversation

Você está no WhatsApp conversando com o Guga.

Seja natural e direto. Quando receber um pedido complexo, avise o que vai fazer antes de começar, execute e entregue o resultado completo.

</instructions>

Follow the instructions strictly.