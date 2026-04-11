import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { streamSSE } from "hono/streaming";
import {
  writeFileSync,
  mkdirSync,
  cpSync,
  existsSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { query, createOpenRouterRegistry, type ProviderRegistry, type Model, type Query, type SDKMessage } from "../../sdk-3/src/index.js";

// ---------------------------------------------------------------------------
// Provider / Model configuration (via sdk-3 registry)
// ---------------------------------------------------------------------------

const registry = createOpenRouterRegistry({
  apiKey: "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",
  models: [
    { id: "x-ai/grok-4.1-fast", label: "Grok 4.1 Fast" },
    { id: "x-ai/grok-4.20", label: "Grok 4.20" },
    { id: "openai/gpt-5.3-codex", label: "GPT-5.3 Codex" },
    { id: "openai/gpt-5.1-codex-mini", label: "GPT-5.1 Codex Mini" },
    { id: "openai/gpt-5.4", label: "GPT-5.4" },
    { id: "openai/gpt-4.1", label: "GPT-4.1" },
    { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    { id: "qwen/qwen3-coder-plus", label: "Qwen3 Coder Plus" },
    { id: "qwen/qwen3-coder-flash", label: "Qwen3 Coder Flash" },
    { id: "meta-llama/llama-4-maverick", label: "Llama 4 Maverick" },
    { id: "deepseek/deepseek-r1", label: "DeepSeek R1" },
    { id: "anthropic/claude-opus-4", label: "Claude Opus 4" },
    { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  ]
});

// ---------------------------------------------------------------------------
// Workspace management
// ---------------------------------------------------------------------------

const WORKSPACES_DIR = resolve(process.cwd(), "workspaces");
const TEMPLATE_DIR = join(WORKSPACES_DIR, ".template");

function createWorkspace(sessionId: string): string {
  const wsDir = join(WORKSPACES_DIR, sessionId);
  if (!existsSync(wsDir)) {
    cpSync(TEMPLATE_DIR, wsDir, { recursive: true });
    console.log(`[server] Created workspace: ${wsDir}`);
  }
  return wsDir;
}

// ---------------------------------------------------------------------------
// Session state
// ---------------------------------------------------------------------------

interface SessionState {
  cliSessionId: string | null;
  name: string;
  createdAt: string;
  cwd: string;
  modelId: string;
}

const sessions = new Map<string, SessionState>();

// Create default session with its own workspace
const defaultWs = createWorkspace("default");
sessions.set("default", {
  cliSessionId: null,
  name: "Nova sessão",
  createdAt: new Date().toISOString(),
  cwd: defaultWs,
  modelId: registry.models[0].id,
});

// Active SDK queries (for aborting)
const activeQueries = new Map<string, Query>();

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: (origin) =>
      origin.startsWith("http://localhost:") ? origin : "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }),
);

// GET /api/models — list available models
app.get("/api/models", (c) => {
  return c.json(registry.models.map((m) => ({ id: m.id, label: m.label })));
});

// GET /api/sessions
app.get("/api/sessions", (c) => {
  const list = Array.from(sessions.entries()).map(([id, s]) => ({
    id,
    name: s.name,
    createdAt: s.createdAt,
    lastMessageAt: s.createdAt,
    cliSessionId: s.cliSessionId,
    modelId: s.modelId,
  }));
  return c.json(list);
});

// POST /api/sessions — create a new session with its own workspace
app.post("/api/sessions", async (c) => {
  const body = await c.req
    .json<{ name?: string; modelId?: string }>()
    .catch(() => ({}));
  const id = `session_${Date.now()}`;
  const wsDir = createWorkspace(id);
  sessions.set(id, {
    cliSessionId: null,
    name: body.name || "Nova sessão",
    createdAt: new Date().toISOString(),
    cwd: wsDir,
    modelId: body.modelId || registry.models[0].id,
  });
  return c.json({ id, ...sessions.get(id) });
});

// GET /api/sessions/:id
app.get("/api/sessions/:id", (c) => {
  const id = c.req.param("id");
  const session = sessions.get(id);
  if (!session) return c.json({ error: "Not found" }, 404);
  return c.json({ id, ...session, messages: [] });
});

// POST /api/sessions/:id/permission — respond to permission requests
// NOTE: Permission responses via stdin require plan mode with stream-json input.
// The SDK currently doesn't expose stdin for mid-stream writes, so plan mode
// permission dialogs are not yet supported in this SDK-based implementation.
// This endpoint is kept as a stub for forward compatibility.
app.post("/api/sessions/:id/permission", async (c) => {
  const body = await c.req.json<{
    requestId: string;
    behavior: "allow" | "deny" | "allowForSession";
  }>();
  console.log(`[server] Permission ${body.behavior} for request ${body.requestId} (stub — not yet supported via SDK)`);
  return c.json({ ok: true, note: "Permission responses not yet supported via SDK" });
});

// POST /api/sessions/:id/message
app.post("/api/sessions/:id/message", async (c) => {
  const id = c.req.param("id");
  let session = sessions.get(id);

  if (!session) {
    const wsDir = createWorkspace(id);
    session = {
      cliSessionId: null,
      name: "Nova sessão",
      createdAt: new Date().toISOString(),
      cwd: wsDir,
      modelId: registry.models[0].id,
    };
    sessions.set(id, session);
  }

  interface MessageBody {
    content: string;
    modelId?: string;
    planMode?: boolean;
    images?: { base64: string; mediaType: string }[];
  }

  const body = await c.req.json<MessageBody>();
  let prompt = body.content;
  const hasImages = body.images && body.images.length > 0;

  // Allow switching model per-message (resets session if model changed)
  if (body.modelId && body.modelId !== session.modelId) {
    session.modelId = body.modelId;
    session.cliSessionId = null;
  }

  // Save images as temp files and reference them in the prompt
  if (hasImages) {
    const imgDir = join(tmpdir(), "proto7-images");
    mkdirSync(imgDir, { recursive: true });
    const imagePaths: string[] = [];
    for (const img of body.images!) {
      const ext = img.mediaType.split("/")[1] || "png";
      const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filepath = join(imgDir, filename);
      writeFileSync(filepath, Buffer.from(img.base64, "base64"));
      imagePaths.push(filepath);
    }
    const imageRefs = imagePaths
      .map((p) => `Leia e analise a imagem: ${p}`)
      .join("\n");
    prompt = `${imageRefs}\n\n${prompt}`;
  }

  console.log(
    `[server] query() (model: ${session.modelId}) for session "${id}" (cli: ${session.cliSessionId || "new"})`,
  );
  console.log(
    `[server] Prompt: ${prompt.substring(0, 100)}${hasImages ? ` [+${body.images!.length} image(s)]` : ""}`,
  );

  return streamSSE(c, async (stream) => {
    const abortController = new AbortController();

    stream.onAbort(() => {
      console.log(`[server] Client disconnected, aborting query`);
      abortController.abort();
      activeQueries.delete(id);
    });

    // Build system prompt append for images
    let systemPromptAppend: string | undefined;
    if (hasImages) {
      systemPromptAppend =
        "IMPORTANT: When using the Read tool to read image files (PNG, JPG, etc), you MUST only provide the file_path parameter. Do NOT include offset, limit, or pages parameters. The Read tool natively supports reading images when given just the file_path. Example: Read({file_path: '/path/to/image.png'})";
    }

    // Use sdk-3 query() with registry-based model resolution
    const isPlanMode = body.planMode || false;
    const q = query({
      prompt: prompt,
      model: session!.modelId,
      registry,
      options: {
        cwd: session!.cwd,
        resume: session!.cliSessionId || undefined,
        allowDangerouslySkipPermissions: !isPlanMode,
        permissionMode: isPlanMode ? "plan" : undefined,
        pathToClaudeCodeExecutable: "openclaude",
        abortController,
        ...(systemPromptAppend
          ? { systemPrompt: { type: "preset" as const, preset: "claude_code" as const, append: systemPromptAppend } }
          : {}),
      },
    });

    activeQueries.set(id, q);

    try {
      for await (const message of q) {
        if (abortController.signal.aborted) break;

        // Capture CLI session ID from system init event
        if (
          message.type === "system" &&
          "subtype" in message &&
          (message as { subtype?: string }).subtype === "init"
        ) {
          const sessionId = (message as { session_id?: string }).session_id;
          if (sessionId && !session!.cliSessionId) {
            session!.cliSessionId = sessionId;
            console.log(
              `[server] Session "${id}" bound to CLI session: ${sessionId}`,
            );
          }
        }

        // Stream each SDK message as SSE event
        await stream.writeSSE({
          event: message.type || "unknown",
          data: JSON.stringify(message),
        });
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`[server] Query error: ${msg}`);
        try {
          await stream.writeSSE({
            event: "error",
            data: JSON.stringify({ error: msg }),
          });
        } catch { /* stream may be closed */ }
      }
    } finally {
      activeQueries.delete(id);
    }
  });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const port = 3216;
console.log(`Server listening on http://localhost:${port}`);
console.log(
  `Models: ${registry.models.map((m) => m.label).join(", ")}`,
);
serve({ fetch: app.fetch, port });
