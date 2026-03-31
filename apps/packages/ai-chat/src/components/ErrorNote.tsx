import { AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils.js";

export interface ErrorNoteProps {
  onRetry?: () => void;
  className?: string;
}

export function ErrorNote({ onRetry, className }: ErrorNoteProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive",
        className
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="flex-1">Falha ao processar mensagem</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
        >
          <RotateCcw className="size-3.5" />
          Tentar novamente
        </button>
      )}
    </div>
  );
}
