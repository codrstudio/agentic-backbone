import { runAiAgent } from "../agent.js";
import type { AgentEvent, AgentRunOptions } from "../schemas.js";
import type { ProxyAdapter } from "./types.js";
import type { WebSearchResult, WebSearchProvider } from "../tools/web-search.js";
import { braveSearch } from "../tools/brave-search.js";

/**
 * DuckDuckGo HTML search scraper — no API key needed.
 */
async function duckDuckGoSearch(query: string, numResults: number): Promise<WebSearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });
  if (!res.ok) return [];
  const html = await res.text();

  const results: WebSearchResult[] = [];
  const resultPattern = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null;
  while ((match = resultPattern.exec(html)) !== null && results.length < numResults) {
    const rawUrl = match[1];
    const title = match[2].replace(/<[^>]+>/g, "").trim();
    const snippet = match[3].replace(/<[^>]+>/g, "").trim();
    // DuckDuckGo uses redirect URLs — extract the real URL
    const realUrl = new URL(rawUrl, "https://duckduckgo.com").searchParams.get("uddg") ?? rawUrl;
    if (title && snippet) {
      results.push({ title, url: realUrl, snippet });
    }
  }
  return results;
}

/**
 * Resolve web search provider from providerConfig.
 * Returns undefined when search is disabled ("none").
 */
function resolveSearchProvider(providerConfig?: Record<string, any>): WebSearchProvider | undefined {
  const provider = providerConfig?.webSearch ?? "duckduckgo";
  if (provider === "none") return undefined;
  if (provider === "brave" && providerConfig?.braveApiKey) {
    return (q: string, n: number) => braveSearch(q, n, providerConfig.braveApiKey);
  }
  return duckDuckGoSearch;
}

export function createAiAdapter(): ProxyAdapter {
  return {
    async *run(options: AgentRunOptions): AsyncGenerator<AgentEvent> {
      const startMs = Date.now();
      const onWebSearch = resolveSearchProvider(options.providerConfig);

      console.log(`[proxy:ai] model=${options.model} role=${options.role ?? "conversation"} webSearch=${options.providerConfig?.webSearch ?? "duckduckgo"}`);

      for await (const event of runAiAgent(options.prompt, {
        model: options.model,
        apiKey: options.apiKey,
        sessionId: options.sessionId,
        sessionDir: options.sessionDir,
        maxSteps: options.maxTurns ?? 30,
        ...(onWebSearch ? { onWebSearch } : {}),
        ...(options.tools ? { tools: options.tools } : {}),
      })) {
        // Map AiAgentEvent → AgentEvent (4 base types only)
        if (event.type === "init") {
          yield { type: "init", sessionId: event.sessionId };
        } else if (event.type === "text") {
          yield { type: "text", content: event.content };
        } else if (event.type === "result") {
          yield { type: "result", content: event.content };
        } else if (event.type === "usage") {
          yield {
            type: "usage",
            usage: {
              inputTokens: event.usage.inputTokens,
              outputTokens: event.usage.outputTokens,
              cacheReadInputTokens: event.usage.cacheReadInputTokens,
              cacheCreationInputTokens: event.usage.cacheCreationInputTokens,
              totalCostUsd: event.usage.totalCostUsd,
              numTurns: event.usage.numTurns,
              durationMs: event.usage.durationMs || (Date.now() - startMs),
              durationApiMs: event.usage.durationApiMs,
              stopReason: event.usage.stopReason,
            },
          };
        }
        // Other event types (mcp_connected, step_finish, etc.) are silently dropped
      }
    },
  };
}
