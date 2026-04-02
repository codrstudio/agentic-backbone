"use client";

import { MessageSquare, Plus, Search } from "lucide-react";
import * as React from "react";

import { cn } from "../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { Skeleton } from "../ui/skeleton";
import { CollapsibleGroup } from "./CollapsibleGroup";
import { ConversationListItem } from "./ConversationListItem";
import type { Conversation } from "./types";
import { groupConversations } from "./utils";

interface ConversationListProps {
  conversations: Conversation[];
  activeId?: string;
  isLoading?: boolean;

  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;

  favorites?: Conversation[];
  history?: Conversation[];
  favoritesLabel?: string;
  historyLabel?: string;

  hasMore?: boolean;
  onLoadMore?: () => void;
  loadMoreLabel?: string;
  remainingCount?: number;

  onSelect?: (id: string) => void;
  onRename?: (id: string, title: string) => void;
  onStar?: (id: string, starred: boolean) => void;
  onCreateRequest?: () => void;

  getAgentLabel?: (agentId: string) => string;

  headerExtra?: React.ReactNode;
  filterExtra?: React.ReactNode;
  itemBadgesExtra?: (conv: Conversation) => React.ReactNode;

  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;

  className?: string;
}

function ConversationList({
  conversations,
  activeId,
  isLoading = false,
  search = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  favorites: favoritesProp,
  history: historyProp,
  favoritesLabel = "Favorites",
  historyLabel = "History",
  hasMore = false,
  onLoadMore,
  loadMoreLabel = "Load more",
  remainingCount,
  onSelect,
  onRename,
  onStar,
  onCreateRequest,
  getAgentLabel,
  headerExtra,
  filterExtra,
  itemBadgesExtra,
  emptyIcon,
  emptyTitle = "No conversations",
  emptyDescription = "Start a conversation to begin.",
  className,
}: ConversationListProps) {
  const [renamingId, setRenamingId] = React.useState<string | null>(null);
  const [renameValue, setRenameValue] = React.useState("");
  const [favoritesOpen, setFavoritesOpen] = React.useState(true);
  const [historyOpen, setHistoryOpen] = React.useState(true);

  const derived = React.useMemo(() => groupConversations(conversations), [conversations]);
  const favorites = favoritesProp ?? derived.favorites;
  const history = historyProp ?? derived.history;

  function handleStartRename(conv: Conversation) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setRenamingId(conv.id);
      setRenameValue(conv.title ?? "");
    };
  }

  function handleRenameCommit(id: string) {
    if (renameValue.trim()) {
      onRename?.(id, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  }

  function handleRenameCancel() {
    setRenamingId(null);
    setRenameValue("");
  }

  function renderItem(conv: Conversation) {
    return (
      <ConversationListItem
        key={conv.id}
        conversation={conv}
        agentLabel={getAgentLabel?.(conv.agentId)}
        isActive={conv.id === activeId}
        isRenaming={renamingId === conv.id}
        renameValue={renameValue}
        onRenameChange={setRenameValue}
        onRenameCommit={() => handleRenameCommit(conv.id)}
        onRenameCancel={handleRenameCancel}
        onStartRename={handleStartRename(conv)}
        onToggleStar={(e) => {
          e.stopPropagation();
          onStar?.(conv.id, !conv.starred);
        }}
        onClick={() => onSelect?.(conv.id)}
        badgesExtra={itemBadgesExtra?.(conv)}
      />
    );
  }

  const isEmpty = !isLoading && conversations.length === 0;

  return (
    <div className={cn("flex h-full flex-col", className)}>
      {/* Header row */}
      <div className="flex items-center gap-1 px-2 py-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-7 text-sm"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>
        {headerExtra}
        <Button
          variant="ghost"
          size="icon"
          className="size-8 shrink-0"
          onClick={onCreateRequest}
          aria-label="New conversation"
        >
          <Plus className="size-4" />
        </Button>
      </div>

      {/* Filter row */}
      {filterExtra && <div className="px-2 pb-2">{filterExtra}</div>}

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-2 pb-2">
          {isLoading && (
            <div className="flex flex-col gap-2 pt-1">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          )}

          {isEmpty && (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              {emptyIcon ?? <MessageSquare className="size-10 text-muted-foreground/50" />}
              <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
              <p className="text-xs text-muted-foreground">{emptyDescription}</p>
            </div>
          )}

          {!isLoading && !isEmpty && (
            <>
              {favorites.length > 0 && (
                <CollapsibleGroup
                  label={favoritesLabel}
                  open={favoritesOpen}
                  onToggle={() => setFavoritesOpen((v) => !v)}
                >
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {favorites.map(renderItem)}
                  </div>
                </CollapsibleGroup>
              )}

              {history.length > 0 && (
                <CollapsibleGroup
                  label={historyLabel}
                  open={historyOpen}
                  onToggle={() => setHistoryOpen((v) => !v)}
                >
                  <div className="mt-0.5 flex flex-col gap-0.5">
                    {history.map(renderItem)}
                  </div>

                  {hasMore && (
                    <button
                      className="mt-1 w-full rounded-md py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
                      onClick={onLoadMore}
                    >
                      {loadMoreLabel}
                      {remainingCount != null && remainingCount > 0 && (
                        <span className="ml-1 text-muted-foreground">
                          ({remainingCount} remaining)
                        </span>
                      )}
                    </button>
                  )}
                </CollapsibleGroup>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export { ConversationList };
export type { ConversationListProps };
