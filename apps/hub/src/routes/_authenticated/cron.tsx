import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/cron")({
  component: CronPage,
});

function CronPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Agenda</h1>
      <p className="mt-2 text-muted-foreground">Em breve</p>
    </div>
  );
}
