import { useState } from "react";
import Markdown from "react-markdown";
import { Copy, Check, Activity, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StreamingIndicator } from "./streaming-indicator";
import { MessageFeedback } from "@/components/conversations/message-feedback";

export interface MessageFeedback {
  rating: "up" | "down";
  reason: string | null;
}

export interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
  feedback?: MessageFeedback;
}

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
  sessionId?: string;
  onTrace?: (sessionId: string) => void;
  messageId?: string;
}

export function MessageBubble({ message, isStreaming, sessionId, onTrace, messageId }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  function handleCopy() {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (isUser) {
    return (
      <div className="group flex w-full justify-end">
        <div className="relative max-w-[85%] rounded-2xl bg-muted px-4 py-2.5 text-sm">
          <p className="whitespace-pre-wrap">{message.content}</p>
          {!isStreaming && message.content && (
            <div className="absolute -top-3 -left-2 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                onClick={handleCopy}
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Assistant: no bubble, clean text aligned left
  return (
    <div className="group relative w-full text-sm">
      <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
        <Markdown>{message.content}</Markdown>
        {isStreaming && <StreamingIndicator />}
      </div>

      {Boolean(message.metadata?.agentId) && (
        <div className="mt-1.5">
          <Badge variant="outline" className="gap-1 text-[10px] px-1.5 py-0">
            <Bot className="size-2.5" />
            {message.metadata?.agentId as string}
          </Badge>
        </div>
      )}

      {!isStreaming && message.content && (
        <div className="mt-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {sessionId && onTrace && (
            <Button
              variant="ghost"
              size="icon"
              className="size-6"
              title="Ver trace"
              onClick={() => onTrace(sessionId)}
            >
              <Activity className="size-3" />
            </Button>
          )}
          {sessionId && messageId && (
            <MessageFeedback
              sessionId={sessionId}
              messageId={messageId}
              feedback={message.feedback}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          </Button>
        </div>
      )}
    </div>
  );
}
