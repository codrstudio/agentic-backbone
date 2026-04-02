"use client";

import { Pencil, Star } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";
import { Input } from "../ui/input";
import { formatRelativeTime } from "./utils";
import type { Conversation } from "./types";

interface ConversationListItemProps {
  conversation: Conversation;
  agentLabel?: string;
  isActive?: boolean;
  isRenaming?: boolean;
  renameValue?: string;
  onRenameChange?: (value: string) => void;
  onRenameCommit?: () => void;
  onRenameCancel?: () => void;
  onStartRename?: (e: React.MouseEvent) => void;
  onToggleStar?: (e: React.MouseEvent) => void;
  onClick?: () => void;
  badgesExtra?: React.ReactNode;
  className?: string;
}

function ConversationListItem({
  conversation,
  agentLabel,
  isActive,
  isRenaming,
  renameValue = "",
  onRenameChange,
  onRenameCommit,
  onRenameCancel,
  onStartRename,
  onToggleStar,
  onClick,
  badgesExtra,
  className,
}: ConversationListItemProps) {
  const handleRenameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onRenameCommit?.();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onRenameCancel?.();
    }
  };

  return (
    <div
      className={cn(
        "group relative flex items-center gap-1 rounded-md px-1 py-1 hover:bg-accent",
        isActive && "bg-accent",
        className,
      )}
    >
      {/* Star icon */}
      <button
        className={cn(
          "shrink-0 rounded p-0.5 transition-colors",
          conversation.starred
            ? "text-yellow-500 hover:text-yellow-400"
            : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-yellow-500",
        )}
        onClick={onToggleStar}
        aria-label={conversation.starred ? "Unstar conversation" : "Star conversation"}
        tabIndex={-1}
      >
        <Star className={cn("size-3.5", conversation.starred && "fill-yellow-500")} />
      </button>

      {/* Main clickable area */}
      {isRenaming ? (
        <Input
          className="h-6 flex-1 px-1 py-0 text-sm"
          value={renameValue}
          onChange={(e) => onRenameChange?.(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={onRenameCancel}
          autoFocus
        />
      ) : (
        <button
          className="flex min-w-0 flex-1 flex-col items-start text-left"
          onClick={onClick}
        >
          <div className="flex w-full items-center gap-1">
            {agentLabel && (
              <span className="shrink-0 rounded bg-secondary px-1 py-0 text-[10px] text-secondary-foreground">
                {agentLabel}
              </span>
            )}
            {badgesExtra}
            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
              {formatRelativeTime(conversation.updatedAt)}
            </span>
          </div>
          <span className="w-full truncate text-sm text-foreground">
            {conversation.title ?? "Untitled"}
          </span>
        </button>
      )}

      {/* Pencil icon (hover) */}
      {!isRenaming && (
        <button
          className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-colors group-hover:opacity-100 hover:text-foreground"
          onClick={onStartRename}
          aria-label="Rename conversation"
          tabIndex={-1}
        >
          <Pencil className="size-3.5" />
        </button>
      )}
    </div>
  );
}

export { ConversationListItem };
export type { ConversationListItemProps };
