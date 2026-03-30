import { memo } from "react";
import type { Message } from "@ai-sdk/react";
import { cn } from "../lib/utils.js";
import { Markdown } from "./Markdown.js";
import { StreamingIndicator } from "./StreamingIndicator.js";
import { PartRenderer } from "../parts/PartRenderer.js";
import type { DisplayRendererMap } from "../display/registry.js";

export interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  displayRenderers?: DisplayRendererMap;
  className?: string;
}

export const MessageBubble = memo(function MessageBubble({ message, isStreaming, displayRenderers, className }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const hasParts = Array.isArray(message.parts) && message.parts.length > 0;

  return (
    <div className={isUser ? "flex w-full justify-end" : "flex w-full justify-start"}>
      <div
        className={cn(
          "max-w-[80%] min-w-0 rounded-lg px-4 py-2.5 overflow-hidden",
          isUser
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted/40 text-foreground",
          className
        )}
      >
        {hasParts
          ? <div className="flex flex-col gap-3">
              {(message.parts as { type: string }[]).map((part, i) => (
                <PartRenderer
                  key={i}
                  part={part as Parameters<typeof PartRenderer>[0]["part"]}
                  isStreaming={isStreaming}
                  displayRenderers={displayRenderers}
                />
              ))}
            </div>
          : <Markdown>{message.content}</Markdown>
        }
        {isStreaming && !isUser && <StreamingIndicator />}
      </div>
    </div>
  );
}, (prev, next) =>
  prev.message === next.message
  && prev.isStreaming === next.isStreaming
  && prev.displayRenderers === next.displayRenderers
  && prev.className === next.className
);
