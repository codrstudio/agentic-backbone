import { queryOptions } from "@tanstack/react-query";
import { request } from "@/lib/api";

export interface CronSchedule {
  kind: "at" | "every" | "cron";
  at?: string;
  everyMs?: number;
  anchorMs?: number;
  expr?: string;
  tz?: string;
}

export interface CronPayload {
  kind: "heartbeat" | "conversation" | "request";
  message?: string;
}

export interface CronJobDef {
  name: string;
  enabled: boolean;
  schedule: CronSchedule;
  payload: CronPayload;
  description?: string;
}

export interface CronJobState {
  nextRunAtMs?: number;
  runningAtMs?: number;
  lastRunAtMs?: number;
  lastStatus?: "ok" | "error" | "skipped";
  lastError?: string;
  lastDurationMs?: number;
  consecutiveErrors?: number;
}

export interface CronJob {
  slug: string;
  agentId: string;
  def: CronJobDef;
  state: CronJobState;
}

export function cronJobsQueryOptions(params?: {
  agentId?: string;
  includeDisabled?: boolean;
}) {
  const searchParams = new URLSearchParams();
  if (params?.agentId) searchParams.set("agentId", params.agentId);
  if (params?.includeDisabled) searchParams.set("includeDisabled", "true");
  const qs = searchParams.toString();

  return queryOptions({
    queryKey: ["cron-jobs", params?.agentId ?? "all", params?.includeDisabled ?? true],
    queryFn: () =>
      request<CronJob[]>(`/cron/jobs${qs ? `?${qs}` : ""}`),
  });
}

export function cronJobQueryOptions(agentId: string, slug: string) {
  return queryOptions({
    queryKey: ["cron-jobs", agentId, slug],
    queryFn: () => request<CronJob>(`/cron/jobs/${agentId}/${slug}`),
  });
}

export async function runCronJobManually(agentId: string, slug: string) {
  return request<{ ok?: boolean; status?: string }>(
    `/cron/jobs/${agentId}/${slug}/run?mode=force`,
    { method: "POST" }
  );
}
