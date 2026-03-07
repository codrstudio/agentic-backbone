import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/channels")({
  component: ChannelsPage,
});

function ChannelsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Canais</h1>
      <p className="mt-2 text-muted-foreground">Em breve</p>
    </div>
  );
}
