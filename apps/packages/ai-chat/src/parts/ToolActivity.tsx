import { Check, Download, FileText, FilePlus, FolderSearch, Globe, Loader2, Pencil, Search, Terminal, Wrench, type LucideIcon } from "lucide-react";
import { cn } from "../lib/utils.js";

export type ToolActivityState = "call" | "partial-call" | "result";

export interface ToolActivityProps {
  toolName: string;
  state: ToolActivityState;
  args?: Record<string, unknown>;
  className?: string;
  iconMap?: Partial<Record<string, LucideIcon>>;
}

export const defaultToolIconMap: Record<string, LucideIcon> = {
  WebSearch: Globe,
  Bash: Terminal,
  Read: FileText,
  Edit: Pencil,
  Write: FilePlus,
  Grep: Search,
  Glob: FolderSearch,
  WebFetch: Download,
  ListDir: FolderSearch,
};

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveIcon(toolName: string, iconMap: Record<string, LucideIcon | undefined>): LucideIcon {
  return iconMap[toolName] ?? Wrench;
}

function formatArgs(toolName: string, args?: Record<string, unknown>): string | null {
  if (!args) return null;
  if (toolName === "Bash" && args.command) return String(args.command);
  if (toolName === "Read" && args.path) return String(args.path);
  if (toolName === "Edit" && args.file_path) return String(args.file_path);
  if (toolName === "Write" && args.file_path) return String(args.file_path);
  if (toolName === "Grep" && args.pattern) return String(args.pattern);
  if (toolName === "Glob" && args.pattern) return String(args.pattern);
  if (toolName === "WebSearch" && args.query) return String(args.query);
  if (toolName === "ListDir" && args.path) return String(args.path);
  return null;
}

export function ToolActivity({ toolName, state, args, className, iconMap }: ToolActivityProps) {
  const mergedIconMap = iconMap ? { ...defaultToolIconMap, ...iconMap } : defaultToolIconMap;
  const Icon = resolveIcon(toolName, mergedIconMap);
  const isActive = state === "call" || state === "partial-call";
  const displayName = formatToolName(toolName);
  const argsPreview = formatArgs(toolName, args);

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
      "border-amber-500/30 bg-amber-500/5",
      className
    )}>
      <span className="text-amber-500 shrink-0" aria-hidden="true">
        <Icon size={14} />
      </span>
      <span className="font-medium font-mono text-amber-500">{displayName}</span>
      {argsPreview && (
        <span className="truncate text-xs text-muted-foreground font-mono max-w-[300px]">{argsPreview}</span>
      )}
      <span className="ml-auto text-muted-foreground">
        {isActive ? (
          <Loader2 size={14} className="animate-spin text-amber-500" aria-label="Executando..." />
        ) : (
          <Check size={14} className="text-green-500" aria-label="Concluido" />
        )}
      </span>
    </div>
  );
}
