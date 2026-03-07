import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/agents")({
  component: AgentsPage,
});

function AgentsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Agentes</h1>
      <p className="mt-2 text-muted-foreground">Em breve</p>
    </div>
  );
}
