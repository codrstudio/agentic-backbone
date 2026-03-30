import { AlertCircle, CheckCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible.js";
import { cn } from "../lib/utils.js";

export interface ToolResultProps {
  toolName: string;
  result: unknown;
  isError?: boolean;
  className?: string;
}

function serializeResult(result: unknown): string {
  try {
    if (typeof result === "object" && result !== null && "value" in (result as Record<string, unknown>)) {
      return String((result as Record<string, unknown>).value);
    }
    return JSON.stringify(result, null, 2);
  } catch {
    return String(result);
  }
}

function extractPreview(result: unknown): string | null {
  if (typeof result === "string") return result.length > 120 ? result.slice(0, 120) + "..." : result;
  if (typeof result === "object" && result !== null) {
    const r = result as Record<string, unknown>;
    if (typeof r.value === "string") {
      const v = r.value as string;
      return v.length > 120 ? v.slice(0, 120) + "..." : v;
    }
  }
  return null;
}

export function ToolResult({ toolName, result, isError = false, className }: ToolResultProps) {
  const [expanded, setExpanded] = useState(false);
  const serialized = serializeResult(result);
  const preview = extractPreview(result);

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className={className}>
      <div className={cn(
        "rounded-md border text-sm overflow-hidden",
        isError
          ? "border-red-500/30 bg-red-500/5"
          : "border-green-500/30 bg-green-500/5"
      )}>
        <CollapsibleTrigger
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 text-left font-medium hover:bg-muted/50 cursor-pointer",
          )}
          aria-expanded={expanded}
        >
          {isError ? (
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" aria-hidden="true" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-500" aria-hidden="true" />
          )}
          <span className={cn("font-mono text-xs", isError ? "text-red-500" : "text-green-500")}>
            {isError ? `${toolName} erro` : `${toolName} ok`}
          </span>
          {!expanded && preview && (
            <span className="truncate text-xs text-muted-foreground font-mono max-w-[400px] ml-1">{preview}</span>
          )}
          {expanded
            ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-auto" aria-hidden="true" />
            : <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-auto" aria-hidden="true" />
          }
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="max-h-80 overflow-y-auto p-3 font-mono text-xs whitespace-pre-wrap break-all bg-muted/30 border-t border-border">
            {serialized}
          </pre>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
