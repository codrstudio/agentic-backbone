import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { systemDir } from "../context/paths.js";

// --- Types ---

export interface LlmProfile {
  model: string;
}

export interface LlmPlan {
  label: string;
  description: string;
  profiles: Record<string, LlmProfile>;
  effort?: "low" | "medium" | "high" | "max";
  thinking?: { type: "adaptive" } | { type: "enabled"; budgetTokens: number } | { type: "disabled" };
}

export interface LlmConfig {
  active: string;
  plans: Record<string, LlmPlan>;
}

// --- Path ---

function llmConfigPath(): string {
  return join(systemDir(), "llm.json");
}

// --- Read / Write ---

export function loadLlmConfig(): LlmConfig {
  const raw = readFileSync(llmConfigPath(), "utf-8");
  return JSON.parse(raw) as LlmConfig;
}

export function saveLlmConfig(config: LlmConfig): void {
  writeFileSync(llmConfigPath(), JSON.stringify(config, null, 2) + "\n", "utf-8");
}

// --- Resolvers ---

export function getActivePlan(): LlmPlan {
  const config = loadLlmConfig();
  const plan = config.plans[config.active];
  if (!plan) {
    throw new Error(`LLM plan "${config.active}" not found in llm.json`);
  }
  return plan;
}

export function resolveProfile(role: string): LlmProfile {
  const plan = getActivePlan();
  const profile = plan.profiles[role];
  if (!profile) {
    // Fall back to "conversation" profile if role not found
    const fallback = plan.profiles["conversation"];
    if (!fallback) {
      throw new Error(`No profile for role "${role}" and no "conversation" fallback in active LLM plan`);
    }
    return fallback;
  }
  return profile;
}

export function resolveModel(role: string): string {
  return resolveProfile(role).model;
}

export function resolveEffort(): "low" | "medium" | "high" | "max" | undefined {
  return getActivePlan().effort;
}

export function resolveThinking(): LlmPlan["thinking"] | undefined {
  return getActivePlan().thinking;
}
