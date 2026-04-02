import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { GitMerge } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import {
  conversationQueryOptions,
  conversationMessagesQueryOptions,
  sessionQueryOptions,
  renameConversation,
  deleteConversation,
  takeoverConversation,
  releaseConversation,
} from "@/api/conversations";
import { agentsQueryOptions } from "@/api/agents";
import { ConversationBar, buildInitialMessages } from "@codrstudio/agentic-chat";
import { Chat } from "@codrstudio/agentic-chat";
import { useAuthStore } from "@/lib/auth";
import { TakeoverButton } from "@/components/conversations/takeover-button";
import { TakeoverBanner } from "@/components/conversations/takeover-banner";
import { ApprovalInlineActions } from "@/components/approvals/approval-inline-actions";
import { useIsMobile } from "@/hooks/use-mobile";

function getCurrentUserSlug(): string | null {
  const token = useAuthStore.getState().token;
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = JSON.parse(atob(parts[1]!)) as { sub?: string };
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

interface ConversationChatPageProps {
  id: string;
  basePath: string;
}

export function ConversationChatPage({ id, basePath }: ConversationChatPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

  const { data: conversation, isLoading: convLoading } = useQuery(conversationQueryOptions(id));
  const { data: agents } = useQuery(agentsQueryOptions());
  const { data: session } = useQuery(sessionQueryOptions(id));
  const { data: existingMessages, isLoading: msgsLoading } = useQuery(
    conversationMessagesQueryOptions(id),
  );

  const renameMutation = useMutation({
    mutationFn: (title: string) => renameConversation(id, title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", id] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      navigate({ to: basePath as string });
    },
  });

  const takeoverMutation = useMutation({
    mutationFn: () => takeoverConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", id, "session"] });
    },
  });

  const releaseMutation = useMutation({
    mutationFn: () => releaseConversation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations", id, "session"] });
    },
  });

  const isUnderTakeover = session?.takeover_by != null;
  // getCurrentUserSlug is used for ownership checks — keep for future use
  void getCurrentUserSlug;

  function handleExport() {
    const token = useAuthStore.getState().token;
    const url = `/api/v1/ai/conversations/${id}/export${token ? `?token=${encodeURIComponent(token)}` : ""}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversation-${id}.json`;
    a.click();
  }

  const agentLabel =
    agents?.find((a) => a.id === conversation?.agentId)?.slug ?? conversation?.agentId ?? "";

  const token = useAuthStore.getState().token ?? "";

  if (convLoading || msgsLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full flex-1" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">Conversa nao encontrada.</p>
          <Link to={basePath as string} className="text-sm text-primary underline">
            Voltar para Conversas
          </Link>
        </div>
      </div>
    );
  }

  const orchestrationPath: string[] = (() => {
    try {
      return session?.orchestration_path
        ? (JSON.parse(session.orchestration_path) as string[])
        : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="chat-active flex h-full gap-3">
      <div className="flex flex-1 flex-col overflow-hidden">
        <ConversationBar
          title={conversation.title}
          agentLabel={agentLabel}
          onRename={(title) => renameMutation.mutate(title)}
          onExport={handleExport}
          onDelete={() => deleteMutation.mutate()}
          onBack={isMobile ? () => navigate({ to: basePath as string }) : undefined}
          isPendingRename={renameMutation.isPending}
          isPendingDelete={deleteMutation.isPending}
          renameLabel="Renomear"
          exportLabel="Exportar"
          deleteLabel="Excluir"
          untitledLabel="Sem titulo"
          actionsExtra={
            !isUnderTakeover ? (
              <TakeoverButton
                sessionId={id}
                onTakeover={() => takeoverMutation.mutate()}
                isPending={takeoverMutation.isPending}
              />
            ) : null
          }
          afterBar={
            <>
              {isUnderTakeover && session?.takeover_by && session?.takeover_at && (
                <TakeoverBanner
                  takenOverBy={session.takeover_by}
                  takenOverAt={session.takeover_at}
                  onRelease={() => releaseMutation.mutate()}
                  isPending={releaseMutation.isPending}
                />
              )}
              <ApprovalInlineActions sessionId={id} />
            </>
          }
        />

        <Chat
          endpoint=""
          token={token}
          sessionId={id}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initialMessages={buildInitialMessages(existingMessages) as any}
          className="flex-1 flex flex-col overflow-hidden"
        />
      </div>

      {orchestrationPath.length > 0 && (
        <div className="hidden w-56 shrink-0 overflow-y-auto rounded-lg border bg-muted/30 p-3 lg:block">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <GitMerge className="size-3.5" />
            Caminho de delegacao
          </div>
          <ol className="space-y-2">
            {orchestrationPath.map((agentId, idx) => (
              <li key={idx} className="flex items-center gap-2 text-xs">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-medium text-primary">
                  {idx + 1}
                </span>
                <span className="truncate font-mono">{agentId}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
