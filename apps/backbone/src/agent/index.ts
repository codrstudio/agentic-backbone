import { runAgent as runProxyAgent, type AgentEvent, type UsageData } from "@agentic-backbone/ai-sdk";
import { resolveModel, resolveEffort, resolveThinking } from "../settings/llm.js";
import { loadWebSearchConfig } from "../settings/web-search.js";
import { readFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export type { AgentEvent, UsageData };

const LOG_PATH = join(process.cwd(), "data", "agent-runs.jsonl");

function logAgentRun(entry: Record<string, unknown>): void {
  try {
    mkdirSync(join(process.cwd(), "data"), { recursive: true });
    appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n");
  } catch {}
}

export async function* runAgent(
  prompt: string,
  options?: {
    sessionId?: string;
    role?: string;
    tools?: Record<string, any>;
    system?: string;
  }
): AsyncGenerator<AgentEvent> {
  const role = options?.role ?? "conversation";
  const model = resolveModel(role);
  const effort = resolveEffort();
  const thinking = resolveThinking();
  const webSearch = loadWebSearchConfig();

  const systemLen = options?.system?.length ?? 0;
  const promptPreview = prompt.slice(0, 120).replace(/\n/g, "\\n");
  console.log(`[agent] role=${role} model=${model} system=${systemLen}ch prompt="${promptPreview}"`);

  logAgentRun({
    ts: new Date().toISOString(),
    role,
    model,
    systemChars: systemLen,
    promptChars: prompt.length,
    hasIdentity: options?.system?.includes("<identity>") ?? false,
    hasInstructions: options?.system?.includes("<instructions>") ?? false,
    promptPreview: prompt.slice(0, 200),
  });

  const apiKey = process.env.OPENROUTER_API_KEY!;

  // Read BRAVE_API_KEY: prefer process.env, fallback to reading .env file directly
  let braveApiKey = process.env.BRAVE_API_KEY;
  if (!braveApiKey) {
    try {
      const envContent = readFileSync(join(process.cwd(), ".env"), "utf-8");
      const match = envContent.match(/^BRAVE_API_KEY=(.+)$/m);
      if (match) braveApiKey = match[1].trim();
    } catch {}
  }
  yield* runProxyAgent({
    model,
    apiKey,
    prompt,
    sessionId: options?.sessionId,
    sessionDir: join(process.cwd(), "data", "ai-sessions"),
    role,
    tools: options?.tools,
    maxTurns: 30,
    ...(options?.system ? { system: options.system } : {}),
    providerConfig: {
      ...(effort ? { effort } : {}),
      ...(thinking ? { thinking } : {}),
      webSearch: webSearch.provider,
      ...(braveApiKey ? { braveApiKey } : {}),
    },
  });
}
