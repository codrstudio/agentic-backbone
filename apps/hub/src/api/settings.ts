import { queryOptions } from "@tanstack/react-query";
import { request } from "@/lib/api";

export interface SlugDef {
  slug: string;
  class: string;
  effort: string;
  llm: { model: string; parameters: Record<string, unknown> };
  tags: string[];
  title: string;
  description: string;
}

export interface LlmPlan {
  name: string;
  title: string;
  description: string;
  slugs: Record<string, SlugDef>;
  roles: Record<string, string>;
}

export interface LlmConfig {
  activePlan: string;
  plans: LlmPlan[];
}

export function llmSettingsQueryOptions() {
  return queryOptions({
    queryKey: ["settings", "llm"],
    queryFn: () => request<LlmConfig>("/settings/llm"),
  });
}

export function activateLlmPlan(activePlan: string) {
  return request<LlmConfig>("/settings/llm", {
    method: "PATCH",
    body: JSON.stringify({ activePlan }),
  });
}

export type WebSearchProvider = "duckduckgo" | "brave" | "none";

export interface WebSearchConfig {
  provider: WebSearchProvider;
}

export function webSearchSettingsQueryOptions() {
  return queryOptions({
    queryKey: ["settings", "web-search"],
    queryFn: () => request<WebSearchConfig>("/settings/web-search"),
  });
}

export function updateWebSearchProvider(provider: WebSearchProvider) {
  return request<WebSearchConfig>("/settings/web-search", {
    method: "PATCH",
    body: JSON.stringify({ provider }),
  });
}

export interface SystemInfo {
  version: string;
  nodeVersion: string;
  platform: string;
  contextDir: string;
}

export interface SystemEnv {
  OPENROUTER_API_KEY: boolean;
  OPENAI_API_KEY: boolean;
  BACKBONE_PORT: string;
  NODE_ENV: string;
}

export function systemInfoQueryOptions() {
  return queryOptions({
    queryKey: ["system", "info"],
    queryFn: () => request<SystemInfo>("/system/info"),
  });
}

export function systemEnvQueryOptions() {
  return queryOptions({
    queryKey: ["system", "env"],
    queryFn: () => request<SystemEnv>("/system/env"),
  });
}
