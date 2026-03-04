import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { LlmConfig, WebSearchConfig, WebSearchProviderType } from "./types";

export const llmConfigQuery = queryOptions({
  queryKey: ["settings", "llm"],
  queryFn: () => api.get<LlmConfig>("/settings/llm"),
});

export function useUpdateLlmPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (active: string) =>
      api.patch<LlmConfig>("/settings/llm", { active }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "llm"] });
    },
  });
}

// --- Web Search ---

export const webSearchConfigQuery = queryOptions({
  queryKey: ["settings", "web-search"],
  queryFn: () => api.get<WebSearchConfig>("/settings/web-search"),
});

export function useUpdateWebSearchProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (provider: WebSearchProviderType) =>
      api.patch<WebSearchConfig>("/settings/web-search", { provider }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["settings", "web-search"] });
    },
  });
}
