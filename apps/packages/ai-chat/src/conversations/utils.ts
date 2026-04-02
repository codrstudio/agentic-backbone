import type { Message } from "@ai-sdk/react";
import type { BackendMessage, Conversation } from "./types";

export function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function buildInitialMessages(messages?: BackendMessage[]): Message[] | undefined {
  if (!messages) return undefined;

  type Part = {
    type?: string;
    text?: string;
    toolCallId?: string;
    toolName?: string;
    input?: Record<string, unknown>;
    output?: unknown;
    _ref?: string;
    mimeType?: string;
  };

  // Index tool results by toolCallId
  const toolResults = new Map<string, { toolName: string; result: unknown }>();
  for (const m of messages) {
    if (m.role === "tool" && Array.isArray(m.content)) {
      for (const part of m.content as Part[]) {
        if (part.type === "tool-result" && part.toolCallId) {
          const raw = part.output as { type?: string; value?: unknown } | unknown;
          const value =
            typeof raw === "object" &&
            raw !== null &&
            "type" in (raw as Record<string, unknown>) &&
            (raw as Record<string, unknown>).type === "json"
              ? (raw as { value: unknown }).value
              : raw;
          toolResults.set(part.toolCallId, { toolName: part.toolName ?? "", result: value });
        }
      }
    }
  }

  const result: Message[] = [];
  let i = 0;

  while (i < messages.length) {
    const m = messages[i]!;

    if (m.role === "user") {
      let content = "";
      const parts: unknown[] = [];

      if (typeof m.content === "string") {
        content = m.content;
      } else if (Array.isArray(m.content)) {
        for (const p of m.content as Record<string, unknown>[]) {
          if (p["type"] === "text") {
            const text = String(p["text"] ?? "");
            if (!text.startsWith("[📎") && !content) content = text;
            parts.push(p);
          } else if (p["type"] === "image" || p["type"] === "file") {
            parts.push({ type: p["type"], _ref: p["_ref"], mimeType: p["mimeType"] });
          } else {
            parts.push(p);
          }
        }
      }

      result.push({
        id: m._meta?.id ?? m.id ?? `msg-${i}`,
        role: "user",
        content,
        ...(parts.length > 0 ? { parts } : {}),
      } as Message);
      i++;
      continue;
    }

    if (m.role === "tool") {
      i++;
      continue;
    }

    if (m.role === "assistant") {
      const parts: unknown[] = [];
      let textContent = "";
      const id = m._meta?.id ?? m.id ?? `msg-${i}`;

      while (
        i < messages.length &&
        (messages[i]!.role === "assistant" || messages[i]!.role === "tool")
      ) {
        const cur = messages[i]!;

        if (cur.role === "tool") {
          i++;
          continue;
        }

        if (typeof cur.content === "string") {
          if (cur.content) {
            parts.push({ type: "text", text: cur.content });
            textContent += cur.content;
          }
        } else if (Array.isArray(cur.content)) {
          for (const p of cur.content as Part[]) {
            if (p.type === "text" && p.text) {
              parts.push({ type: "text", text: p.text });
              textContent += p.text;
            } else if (p.type === "tool-call" && p.toolCallId) {
              const tr = toolResults.get(p.toolCallId);
              parts.push({
                type: "tool-invocation",
                toolInvocation: {
                  toolName: p.toolName ?? "",
                  toolCallId: p.toolCallId,
                  state: tr ? "result" : "call",
                  args: p.input,
                  result: tr?.result,
                },
              });
            }
          }
        }
        i++;
      }

      result.push({ id, role: "assistant", content: textContent, parts } as Message);
      continue;
    }

    i++;
  }

  return result;
}

export function groupConversations(conversations: Conversation[]): {
  favorites: Conversation[];
  history: Conversation[];
} {
  const favorites: Conversation[] = [];
  const history: Conversation[] = [];
  for (const conv of conversations) {
    if (conv.starred) {
      favorites.push(conv);
    } else {
      history.push(conv);
    }
  }
  return { favorites, history };
}
