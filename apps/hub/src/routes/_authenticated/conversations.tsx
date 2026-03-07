import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/conversations")({
  component: ConversationsPage,
});

function ConversationsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Conversas</h1>
      <p className="mt-2 text-muted-foreground">Em breve</p>
    </div>
  );
}
