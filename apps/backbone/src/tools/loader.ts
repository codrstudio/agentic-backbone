import { resolveTools } from "../context/resolver.js";

export interface ToolApprovalConfig {
  name: string;
  approvalLabel: string;
  approvalTimeoutSeconds: number;
}

/**
 * Loads TOOL.md files for an agent and returns a map of tool name → approval config
 * for all tools that have requires_approval: true.
 */
export function loadToolApprovalConfigs(
  agentId: string
): Map<string, ToolApprovalConfig> {
  const resolved = resolveTools(agentId);
  const configs = new Map<string, ToolApprovalConfig>();

  for (const [slug, entry] of resolved) {
    if (!entry.metadata.requires_approval) continue;

    const name = (entry.metadata.name as string | undefined) ?? slug;
    const approvalLabel =
      (entry.metadata.approval_label as string | undefined) ?? name;
    const approvalTimeoutSeconds = Number(
      entry.metadata.approval_timeout_seconds ?? 300
    );

    configs.set(name, { name, approvalLabel, approvalTimeoutSeconds });
  }

  return configs;
}
