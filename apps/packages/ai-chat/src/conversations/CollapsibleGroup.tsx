"use client";

import { ChevronRight } from "lucide-react";
import * as React from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { cn } from "../lib/utils";

interface CollapsibleGroupProps {
  label: string;
  icon?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleGroup({ label, icon, open, onToggle, children }: CollapsibleGroupProps) {
  return (
    <Collapsible open={open} onOpenChange={onToggle}>
      <CollapsibleTrigger asChild>
        <button
          className="flex w-full items-center gap-1 px-2 py-1 hover:bg-accent rounded-md"
          aria-expanded={open}
        >
          <ChevronRight
            className={cn(
              "size-3 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-90",
            )}
          />
          {icon && <span className="shrink-0">{icon}</span>}
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>{children}</CollapsibleContent>
    </Collapsible>
  );
}

export { CollapsibleGroup };
export type { CollapsibleGroupProps };
