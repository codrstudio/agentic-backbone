import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import type { HeartbeatLogEntry } from "@/api/agents";

interface HeartbeatTimelineProps {
  entries: HeartbeatLogEntry[];
  loading?: boolean;
}

const statusMap = {
  ok: { label: "OK", className: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/20" },
  skipped: { label: "Skip", className: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/20" },
  error: { label: "Erro", className: "bg-destructive/15 text-destructive border-destructive/20" },
} as const;

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `ha ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  const days = Math.floor(hours / 24);
  return `ha ${days}d`;
}

function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}

function TimelineEntry({ entry }: { entry: HeartbeatLogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const config = statusMap[entry.status];

  return (
    <button
      type="button"
      className="flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="mt-0.5 text-muted-foreground">
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={config.className}>
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(entry.createdAt)}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDuration(entry.durationMs)}
          </span>
        </div>
        {entry.preview && (
          <p className={`text-sm text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}>
            {entry.preview}
          </p>
        )}
      </div>
    </button>
  );
}

export function HeartbeatTimeline({ entries, loading }: HeartbeatTimelineProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          Nenhum heartbeat registrado
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <div className="divide-y">
        {entries.map((entry) => (
          <TimelineEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </ScrollArea>
  );
}
