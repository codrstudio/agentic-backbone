import { Hono } from "hono";
import { requireSysuser } from "./auth-helpers.js";
import { loadLlmConfig, saveLlmConfig } from "../settings/llm.js";

import { loadWebSearchConfig, saveWebSearchConfig, isValidWebSearchProvider } from "../settings/web-search.js";

export const settingsRoutes = new Hono();

// --- GET /settings/llm ---

settingsRoutes.get("/settings/llm", (c) => {
  const denied = requireSysuser(c);
  if (denied) return denied;

  const config = loadLlmConfig();
  return c.json(config);
});

// --- PATCH /settings/llm ---

settingsRoutes.patch("/settings/llm", async (c) => {
  const denied = requireSysuser(c);
  if (denied) return denied;

  const body = await c.req.json<{ active?: string }>();

  if (!body.active) {
    return c.json({ error: "'active' is required" }, 400);
  }

  const config = loadLlmConfig();

  if (!config.plans[body.active]) {
    return c.json({ error: `plan "${body.active}" not found in llm.json` }, 404);
  }

  config.active = body.active;
  saveLlmConfig(config);
  return c.json(config);
});

// --- GET /settings/web-search ---

settingsRoutes.get("/settings/web-search", (c) => {
  const denied = requireSysuser(c);
  if (denied) return denied;

  return c.json(loadWebSearchConfig());
});

// --- PATCH /settings/web-search ---

settingsRoutes.patch("/settings/web-search", async (c) => {
  const denied = requireSysuser(c);
  if (denied) return denied;

  const body = await c.req.json<{ provider?: string }>();

  if (!body.provider) {
    return c.json({ error: "'provider' is required" }, 400);
  }

  if (!isValidWebSearchProvider(body.provider)) {
    return c.json({ error: `invalid provider "${body.provider}". Valid: duckduckgo, brave, none` }, 400);
  }

  const config = { provider: body.provider };
  saveWebSearchConfig(config);
  return c.json(config);
});
