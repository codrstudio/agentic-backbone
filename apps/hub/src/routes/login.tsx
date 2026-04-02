import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  useEffect(() => {
    const rd = encodeURIComponent(window.location.origin + "/hub/");
    window.location.href = `https://proxy.processa.info/?rd=${rd}`;
  }, []);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-4">
      <p className="text-sm text-muted-foreground">Redirecionando para autenticação...</p>
    </div>
  );
}
