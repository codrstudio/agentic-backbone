/**
 * MCP Notification Handler
 *
 * Bridges MCP server notifications to agent conversations.
 * When an agent goes online via MCP presence tools, this handler activates
 * and dispatches notifications as messages to the agent's persistent session.
 *
 * The agent wakes up with full session history (knows it's online, active chats, etc.)
 * and acts autonomously. No background loops needed.
 */

import { mcpClientPool } from "./client.js";
import {
  createSession,
  sendMessage,
  listSessions,
} from "../../conversations/index.js";

interface ActiveAgent {
  agentId: string;
  adapterSlug: string;
  sessionId: string;
  unsubscribe: (() => void) | null;
  presenceInterval: ReturnType<typeof setInterval> | null;
  busy: boolean; // prevents concurrent dispatches
}

const activeAgents = new Map<string, ActiveAgent>();

/**
 * Activate notification handling for an agent.
 * Called when the agent calls presence_online.
 */
export function activateNotifications(
  agentId: string,
  adapterSlug: string
): void {
  if (activeAgents.has(agentId)) return;

  // Find or create a persistent session for the agent
  const sessions = listSessions("system", agentId);
  let sessionId: string;
  if (sessions.length > 0) {
    sessionId = sessions[sessions.length - 1].session_id;
  } else {
    const session = createSession("system", agentId);
    sessionId = session.session_id;
  }

  // Subscribe to MCP notifications
  const unsubscribe = mcpClientPool.onNotification(
    (slug, method, params) => {
      if (slug !== adapterSlug) return;
      handleNotification(agentId, method, params);
    }
  );

  // Presence heartbeat: refresh TTL every 55s (no LLM, just HTTP call)
  const presenceInterval = setInterval(async () => {
    try {
      await mcpClientPool.callTool(adapterSlug, "presence_heartbeat", {}, agentId);
    } catch {
      // If heartbeat fails, try to re-establish presence
      try {
        await mcpClientPool.callTool(adapterSlug, "presence_online", { limit: 3 }, agentId);
      } catch {
        console.warn(`[mcp-notify] presence refresh failed for ${agentId}`);
      }
    }
  }, 55_000);

  activeAgents.set(agentId, {
    agentId,
    adapterSlug,
    sessionId,
    unsubscribe,
    presenceInterval,
    busy: false,
  });

  console.log(
    `[mcp-notify] activated for ${agentId} (session=${sessionId}, adapter=${adapterSlug})`
  );
}

/**
 * Deactivate notification handling for an agent.
 * Called when the agent calls presence_offline.
 */
export function deactivateNotifications(agentId: string): void {
  const entry = activeAgents.get(agentId);
  if (!entry) return;

  if (entry.presenceInterval) clearInterval(entry.presenceInterval);
  if (entry.unsubscribe) entry.unsubscribe();
  activeAgents.delete(agentId);
  console.log(`[mcp-notify] deactivated for ${agentId}`);
}

/**
 * Check if an agent has active notifications.
 */
export function isNotificationActive(agentId: string): boolean {
  return activeAgents.has(agentId);
}

// --- Internal ---

function handleNotification(
  agentId: string,
  method: string,
  params: Record<string, unknown>
): void {
  let message: string | null = null;

  if (method === "notifications/queue/new") {
    const threadId = params.threadId as string;
    message = `[NOTIFICACAO AUTOMATICA] Novo cliente na fila (threadId: ${threadId}). Verifica a fila, aceita o chat e atende o cliente.`;
  } else if (method === "notifications/comment/created") {
    const authorType = params.authorType as string;
    if (authorType === "customer") {
      const threadId = params.threadId as string;
      message = `[NOTIFICACAO AUTOMATICA] O cliente respondeu no chat ${threadId}. Le a mensagem e responde.`;
    }
  } else if (method === "notifications/queue/taken") {
    const threadId = params.threadId as string;
    const attendantId = params.attendantId as string;
    console.log(
      `[mcp-notify] queue/taken: thread ${threadId} by ${attendantId}`
    );
  }

  if (message) {
    dispatchToAgent(agentId, message);
  }
}

async function dispatchToAgent(
  agentId: string,
  message: string
): Promise<void> {
  const entry = activeAgents.get(agentId);
  if (!entry) return;

  // Prevent concurrent dispatches — queue would cause out-of-order responses
  if (entry.busy) {
    console.log(`[mcp-notify] ${agentId} busy, queueing: ${message.slice(0, 60)}...`);
    // Simple retry after a delay
    setTimeout(() => dispatchToAgent(agentId, message), 5_000);
    return;
  }

  entry.busy = true;
  console.log(`[mcp-notify] dispatching to ${agentId}: ${message.slice(0, 80)}...`);

  try {
    for await (const event of sendMessage("system", entry.sessionId, message)) {
      if (event.type === "result") {
        console.log(
          `[mcp-notify] ${agentId} responded: ${(event.content as string).slice(0, 100)}...`
        );
      }
    }
  } catch (err) {
    console.error(`[mcp-notify] dispatch failed for ${agentId}:`, err);
  } finally {
    entry.busy = false;
  }
}
