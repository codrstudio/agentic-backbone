import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { systemDir } from "../context/paths.js";

// --- Types ---

export type WebSearchProviderType = "duckduckgo" | "brave" | "none";

export interface WebSearchConfig {
  provider: WebSearchProviderType;
}

const VALID_PROVIDERS: WebSearchProviderType[] = ["duckduckgo", "brave", "none"];

// --- Path ---

function llmConfigPath(): string {
  return join(systemDir(), "llm.json");
}

// --- Read / Write ---

export function loadWebSearchConfig(): WebSearchConfig {
  const raw = readFileSync(llmConfigPath(), "utf-8");
  const json = JSON.parse(raw);
  const ws = json.webSearch;
  if (ws && VALID_PROVIDERS.includes(ws.provider)) {
    return { provider: ws.provider };
  }
  return { provider: "duckduckgo" };
}

export function saveWebSearchConfig(config: WebSearchConfig): void {
  const raw = readFileSync(llmConfigPath(), "utf-8");
  const json = JSON.parse(raw);
  json.webSearch = { provider: config.provider };
  writeFileSync(llmConfigPath(), JSON.stringify(json, null, 2) + "\n", "utf-8");
}

export function isValidWebSearchProvider(value: string): value is WebSearchProviderType {
  return VALID_PROVIDERS.includes(value as WebSearchProviderType);
}
