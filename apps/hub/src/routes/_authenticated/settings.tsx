import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Configuracoes</h1>
      <p className="mt-2 text-muted-foreground">Em breve</p>
    </div>
  );
}
