import { Link, useMatchRoute } from "@tanstack/react-router";
import { Bot, MessageSquare, Radio, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Agentes", icon: Bot, to: "/agents" as const },
  { label: "Conversas", icon: MessageSquare, to: "/conversations" as const },
  { label: "Canais", icon: Radio, to: "/channels" as const },
  { label: "Config", icon: Settings, to: "/settings" as const },
] as const;

export function BottomNav() {
  const matchRoute = useMatchRoute();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-14 items-center justify-around border-t bg-background md:hidden">
      {navItems.map((item) => {
        const isActive = !!matchRoute({ to: item.to, fuzzy: true });
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-0.5 py-1 text-xs transition-colors",
              isActive
                ? "text-primary font-medium"
                : "text-muted-foreground",
            )}
          >
            <item.icon className="size-5" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
