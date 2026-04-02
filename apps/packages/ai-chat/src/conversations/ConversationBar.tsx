"use client";

import * as React from "react";
import { ArrowLeft, Download, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../lib/utils";
import { DeleteDialog } from "./DeleteDialog";
import { RenameDialog } from "./RenameDialog";

interface ConversationBarProps {
  title?: string;
  agentLabel?: string;
  isLoading?: boolean;

  onRename?: (title: string) => void;
  onExport?: () => void;
  onDelete?: () => void;
  onBack?: () => void;

  renameOpen?: boolean;
  onRenameOpenChange?: (open: boolean) => void;
  deleteOpen?: boolean;
  onDeleteOpenChange?: (open: boolean) => void;

  isPendingRename?: boolean;
  isPendingDelete?: boolean;

  renameLabel?: string;
  exportLabel?: string;
  deleteLabel?: string;
  untitledLabel?: string;

  actionsExtra?: React.ReactNode;
  menuItemsExtra?: React.ReactNode;
  afterBar?: React.ReactNode;

  className?: string;
}

function ConversationBar({
  title,
  agentLabel,
  isLoading,
  onRename,
  onExport,
  onDelete,
  onBack,
  renameOpen: renameOpenProp,
  onRenameOpenChange,
  deleteOpen: deleteOpenProp,
  onDeleteOpenChange,
  isPendingRename,
  isPendingDelete,
  renameLabel = "Rename",
  exportLabel = "Export",
  deleteLabel = "Delete",
  untitledLabel = "Untitled",
  actionsExtra,
  menuItemsExtra,
  afterBar,
  className,
}: ConversationBarProps) {
  const [internalRenameOpen, setInternalRenameOpen] = React.useState(false);
  const [internalDeleteOpen, setInternalDeleteOpen] = React.useState(false);
  const [renameValue, setRenameValue] = React.useState("");

  const isControlledRename = renameOpenProp !== undefined && onRenameOpenChange !== undefined;
  const isControlledDelete = deleteOpenProp !== undefined && onDeleteOpenChange !== undefined;

  const renameOpen = isControlledRename ? renameOpenProp : internalRenameOpen;
  const deleteOpen = isControlledDelete ? deleteOpenProp : internalDeleteOpen;

  const setRenameOpen = (open: boolean) => {
    if (isControlledRename) {
      onRenameOpenChange!(open);
    } else {
      setInternalRenameOpen(open);
    }
  };

  const setDeleteOpen = (open: boolean) => {
    if (isControlledDelete) {
      onDeleteOpenChange!(open);
    } else {
      setInternalDeleteOpen(open);
    }
  };

  const handleRenameClick = () => {
    setRenameValue(title ?? "");
    setRenameOpen(true);
  };

  const handleRenameConfirm = () => {
    if (renameValue.trim()) {
      onRename?.(renameValue.trim());
    }
    setRenameOpen(false);
  };

  const handleDeleteConfirm = () => {
    onDelete?.();
    setDeleteOpen(false);
  };

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center gap-2 border-b bg-background px-3 py-2">
        {onBack && (
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={onBack}>
            <ArrowLeft className="size-4" />
          </Button>
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2">
          {isLoading ? (
            <Skeleton className="h-5 w-40" />
          ) : (
            <span className="truncate text-sm font-medium">{title ?? untitledLabel}</span>
          )}
          {agentLabel && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              {agentLabel}
            </Badge>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {actionsExtra}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleRenameClick}>
                <Pencil className="mr-2 size-4" />
                {renameLabel}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExport}>
                <Download className="mr-2 size-4" />
                {exportLabel}
              </DropdownMenuItem>
              {menuItemsExtra}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 size-4" />
                {deleteLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {afterBar}

      <RenameDialog
        open={renameOpen}
        onOpenChange={setRenameOpen}
        value={renameValue}
        onValueChange={setRenameValue}
        onConfirm={handleRenameConfirm}
        isPending={isPendingRename}
      />

      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
        isPending={isPendingDelete}
      />
    </div>
  );
}

export { ConversationBar };
export type { ConversationBarProps };
