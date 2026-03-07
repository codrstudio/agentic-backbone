import { Hono } from "hono";
import type { Context } from "hono";
import { db } from "../db/index.js";
import { parseBody } from "./helpers.js";

export const evaluationRoutes = new Hono();

// ── Eval Sets ──────────────────────────────────────────────

evaluationRoutes.get("/agents/:id/eval-sets", (c: Context) => {
  const agentId = c.req.param("id");
  const sets = db
    .prepare("SELECT * FROM eval_sets WHERE agent_id = ? ORDER BY created_at DESC")
    .all(agentId);
  return c.json(sets);
});

evaluationRoutes.post("/agents/:id/eval-sets", async (c: Context) => {
  const agentId = c.req.param("id");
  const body = await parseBody<{ name: string; description?: string }>(c);
  if (body instanceof Response) return body;
  if (!body.name) return c.json({ error: "name is required" }, 400);

  const result = db
    .prepare("INSERT INTO eval_sets (agent_id, name, description) VALUES (?, ?, ?)")
    .run(agentId, body.name, body.description ?? null);

  const set = db
    .prepare("SELECT * FROM eval_sets WHERE id = ?")
    .get(result.lastInsertRowid);
  return c.json(set, 201);
});

evaluationRoutes.get("/agents/:id/eval-sets/:setId", (c: Context) => {
  const agentId = c.req.param("id");
  const setId = c.req.param("setId");
  const set = db
    .prepare("SELECT * FROM eval_sets WHERE id = ? AND agent_id = ?")
    .get(setId, agentId);
  if (!set) return c.json({ error: "not found" }, 404);

  const cases = db
    .prepare("SELECT * FROM eval_cases WHERE set_id = ? ORDER BY created_at ASC")
    .all(setId);
  return c.json({ ...(set as object), cases });
});

evaluationRoutes.patch("/agents/:id/eval-sets/:setId", async (c: Context) => {
  const agentId = c.req.param("id");
  const setId = c.req.param("setId");
  const set = db
    .prepare("SELECT id FROM eval_sets WHERE id = ? AND agent_id = ?")
    .get(setId, agentId);
  if (!set) return c.json({ error: "not found" }, 404);

  const body = await parseBody<{ name?: string; description?: string }>(c);
  if (body instanceof Response) return body;

  db.prepare(
    "UPDATE eval_sets SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = datetime('now') WHERE id = ?"
  ).run(body.name ?? null, body.description ?? null, setId);

  const updated = db.prepare("SELECT * FROM eval_sets WHERE id = ?").get(setId);
  return c.json(updated);
});

evaluationRoutes.delete("/agents/:id/eval-sets/:setId", (c: Context) => {
  const agentId = c.req.param("id");
  const setId = c.req.param("setId");
  const set = db
    .prepare("SELECT id FROM eval_sets WHERE id = ? AND agent_id = ?")
    .get(setId, agentId);
  if (!set) return c.json({ error: "not found" }, 404);

  db.prepare("DELETE FROM eval_sets WHERE id = ?").run(setId);
  return c.json({ ok: true });
});

// ── Eval Cases ─────────────────────────────────────────────

evaluationRoutes.post("/agents/:id/eval-sets/:setId/cases", async (c: Context) => {
  const agentId = c.req.param("id");
  const setId = c.req.param("setId");
  const set = db
    .prepare("SELECT id FROM eval_sets WHERE id = ? AND agent_id = ?")
    .get(setId, agentId);
  if (!set) return c.json({ error: "not found" }, 404);

  const body = await parseBody<{ input: string; expected: string; tags?: string }>(c);
  if (body instanceof Response) return body;
  if (!body.input || !body.expected) {
    return c.json({ error: "input and expected are required" }, 400);
  }

  const result = db
    .prepare("INSERT INTO eval_cases (set_id, input, expected, tags) VALUES (?, ?, ?, ?)")
    .run(setId, body.input, body.expected, body.tags ?? null);

  const newCase = db.prepare("SELECT * FROM eval_cases WHERE id = ?").get(result.lastInsertRowid);
  return c.json(newCase, 201);
});

evaluationRoutes.patch("/agents/:id/eval-sets/:setId/cases/:caseId", async (c: Context) => {
  const agentId = c.req.param("id");
  const setId = c.req.param("setId");
  const caseId = c.req.param("caseId");

  const set = db
    .prepare("SELECT id FROM eval_sets WHERE id = ? AND agent_id = ?")
    .get(setId, agentId);
  if (!set) return c.json({ error: "not found" }, 404);

  const evalCase = db
    .prepare("SELECT id FROM eval_cases WHERE id = ? AND set_id = ?")
    .get(caseId, setId);
  if (!evalCase) return c.json({ error: "not found" }, 404);

  const body = await parseBody<{ input?: string; expected?: string; tags?: string }>(c);
  if (body instanceof Response) return body;

  db.prepare(
    "UPDATE eval_cases SET input = COALESCE(?, input), expected = COALESCE(?, expected), tags = COALESCE(?, tags) WHERE id = ?"
  ).run(body.input ?? null, body.expected ?? null, body.tags ?? null, caseId);

  const updated = db.prepare("SELECT * FROM eval_cases WHERE id = ?").get(caseId);
  return c.json(updated);
});

evaluationRoutes.delete("/agents/:id/eval-sets/:setId/cases/:caseId", (c: Context) => {
  const agentId = c.req.param("id");
  const setId = c.req.param("setId");
  const caseId = c.req.param("caseId");

  const set = db
    .prepare("SELECT id FROM eval_sets WHERE id = ? AND agent_id = ?")
    .get(setId, agentId);
  if (!set) return c.json({ error: "not found" }, 404);

  const evalCase = db
    .prepare("SELECT id FROM eval_cases WHERE id = ? AND set_id = ?")
    .get(caseId, setId);
  if (!evalCase) return c.json({ error: "not found" }, 404);

  db.prepare("DELETE FROM eval_cases WHERE id = ?").run(caseId);
  return c.json({ ok: true });
});
