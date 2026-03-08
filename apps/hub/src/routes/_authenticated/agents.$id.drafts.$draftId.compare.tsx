import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/agents/$id/drafts/$draftId/compare")({
  component: DraftComparePage,
});

function DraftComparePage() {
  const { id: agentId, draftId } = Route.useParams();

  return (
    <div className="space-y-4">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/agents" className="hover:text-foreground transition-colors">
          Agentes
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          to="/agents/$id"
          params={{ id: agentId }}
          search={{ tab: "sandbox" }}
          className="hover:text-foreground transition-colors"
        >
          {agentId}
        </Link>
        <ChevronRight className="size-3.5" />
        <Link
          to="/agents/$id/drafts/$draftId"
          params={{ id: agentId, draftId }}
          className="hover:text-foreground transition-colors"
        >
          Rascunho
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground font-medium">Comparacao</span>
      </nav>
      <p className="text-sm text-muted-foreground">
        Comparacao side-by-side sera implementada em F-122.
      </p>
    </div>
  );
}
