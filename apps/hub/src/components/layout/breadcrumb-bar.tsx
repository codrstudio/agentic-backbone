import { useMatches } from "@tanstack/react-router";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const routeLabels: Record<string, string> = {
  "/agents": "Agentes",
  "/conversations": "Conversas",
  "/channels": "Canais",
  "/cron": "Agenda",
  "/settings": "Configuracoes",
};

export function BreadcrumbBar() {
  const matches = useMatches();

  const crumbs: string[] = [];
  for (const match of matches) {
    const label = routeLabels[match.pathname];
    if (label) crumbs.push(label);
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="md:hidden" />
      {crumbs.length > 0 && (
        <>
          <Separator orientation="vertical" className="mr-2 h-4 md:hidden" />
          <nav className="flex items-center gap-1.5 text-sm">
            {crumbs.map((crumb, i) => (
              <span key={i} className="text-foreground">
                {i > 0 && <span className="mx-1.5 text-muted-foreground">/</span>}
                {crumb}
              </span>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}
