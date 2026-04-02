import { useState, useMemo, useEffect } from "react";
import { useNavigate, useMatch, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  conversationsQueryOptions,
  createConversation,
  renameConversation,
  starConversation,
  type Conversation,
} from "@/api/conversations";
import { agentsQueryOptions } from "@/api/agents";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ConversationList, groupConversations } from "@agentic-backbone/ai-chat";

const PAGE_SIZE = 50;

interface ConversationsLayoutProps {
  fixedAgentId?: string;
  basePath: string;
}

export function ConversationsLayout({ fixedAgentId, basePath }: ConversationsLayoutProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>(fixedAgentId ?? "all");
  const [operatorFilter, setOperatorFilter] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [historyLimit, setHistoryLimit] = useState(PAGE_SIZE);

  // Detect active conversation from current pathname
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const convIdMatch = pathname.match(/\/conversations\/([^/]+)$/);
  const activeId = convIdMatch?.[1];
  const hasActiveChat = !!activeId;

  const isNewRouteMatch = useMatch({ from: "/_authenticated/conversations/new", shouldThrow: false });
  const isNewRoute = !fixedAgentId ? isNewRouteMatch : null;

  const { data: conversations, isLoading: loadingConversations } = useQuery(
    conversationsQueryOptions(),
  );
  const { data: agents } = useQuery(agentsQueryOptions());

  const createMutation = useMutation({
    mutationFn: (agentId: string) => createConversation(agentId),
    onSuccess: (conv) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setSelectedAgent("");
      navigate({ to: `${basePath}/${conv.id}` as string });
    },
  });

  const renameMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameConversation(id, title),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const starMutation = useMutation({
    mutationFn: ({ id, starred }: { id: string; starred: boolean }) =>
      starConversation(id, starred),
    onMutate: async ({ id, starred }) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      const previous = queryClient.getQueryData<Conversation[]>(["conversations"]);
      queryClient.setQueryData<Conversation[]>(["conversations"], (old) =>
        old?.map((c) => (c.id === id ? { ...c, starred } : c)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["conversations"], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["conversations"] }),
  });

  const sorted = useMemo(() => {
    if (!conversations) return [];
    return [...conversations].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }, [conversations]);

  const filtered = useMemo(() => {
    return sorted.filter((c) => {
      const matchesSearch = !search || (c.title ?? "").toLowerCase().includes(search.toLowerCase());
      const matchesAgent = agentFilter === "all" || c.agentId === agentFilter;
      const matchesOperator = !operatorFilter || !!c.takeover_by;
      return matchesSearch && matchesAgent && matchesOperator;
    });
  }, [sorted, search, agentFilter, operatorFilter]);

  const { favorites, history } = useMemo(() => groupConversations(filtered), [filtered]);
  const visibleHistory = useMemo(() => history.slice(0, historyLimit), [history, historyLimit]);

  const agentOptions = useMemo(() => agents?.filter((a) => a.enabled) ?? [], [agents]);

  useEffect(() => {
    if (isNewRoute && agentOptions.length > 0 && !selectedAgent) {
      setSelectedAgent(agentOptions[0].id);
    }
  }, [isNewRoute, agentOptions, selectedAgent]);

  const usedAgentIds = useMemo(
    () => new Set((conversations ?? []).map((c) => c.agentId)),
    [conversations],
  );
  const filterAgents = useMemo(
    () => (agents ?? []).filter((a) => usedAgentIds.has(a.id)),
    [agents, usedAgentIds],
  );

  function handleNewConversation() {
    if (fixedAgentId) {
      createMutation.mutate(fixedAgentId);
    } else {
      navigate({ to: `${basePath}/new` as string });
    }
  }

  // Mobile: hide list when chat is active
  const showList = !isMobile || !hasActiveChat;
  const showOutlet = !isMobile || hasActiveChat;

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-2rem)] overflow-hidden">
      {showList && (
        <ConversationList
          conversations={filtered}
          favorites={favorites}
          history={visibleHistory}
          activeId={activeId}
          isLoading={loadingConversations}
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar..."
          favoritesLabel="Favoritos"
          historyLabel="Histórico"
          loadMoreLabel="Carregar mais"
          emptyTitle="Nenhuma conversa"
          emptyDescription="Inicie uma conversa com um agente."
          onSelect={(id) => navigate({ to: `${basePath}/${id}` as string })}
          onRename={(id, title) => renameMutation.mutate({ id, title })}
          onStar={(id, starred) => starMutation.mutate({ id, starred })}
          onCreateRequest={handleNewConversation}
          getAgentLabel={(agentId) => agents?.find((a) => a.id === agentId)?.slug ?? agentId}
          hasMore={history.length > historyLimit}
          onLoadMore={() => setHistoryLimit((l) => l + PAGE_SIZE)}
          remainingCount={history.length - historyLimit}
          headerExtra={
            <Button
              variant={operatorFilter ? "default" : "ghost"}
              size="icon"
              className="size-8 shrink-0"
              onClick={() => setOperatorFilter((v) => !v)}
              title="Filtrar com operador"
            >
              <User className="size-3.5" />
            </Button>
          }
          filterExtra={
            !fixedAgentId && filterAgents.length > 1 ? (
              <Select value={agentFilter} onValueChange={(v) => v && setAgentFilter(v)}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Todos os agentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os agentes</SelectItem>
                  {filterAgents.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.slug}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null
          }
          itemBadgesExtra={(conv) => {
            const c = conv as Conversation;
            return c.takeover_by ? (
              <Badge variant="default" className="shrink-0 px-1.5 py-0 text-[10px]">
                <User className="mr-0.5 size-2.5" /> Op
              </Badge>
            ) : null;
          }}
          className={cn(isMobile ? "w-full" : "w-80 border-r shrink-0")}
        />
      )}

      {showOutlet && (
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      )}

      {/* New conversation dialog — only in general mode (no fixedAgentId) */}
      {!fixedAgentId && (
        <Dialog
          open={!!isNewRoute}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedAgent("");
              navigate({ to: basePath as string });
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Conversa</DialogTitle>
              <DialogDescription>
                Escolha um agente para iniciar a conversa.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select
                value={selectedAgent}
                onValueChange={(v) => v && setSelectedAgent(v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um agente" />
                </SelectTrigger>
                <SelectContent>
                  {agentOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.slug}
                      {a.description && (
                        <span className="ml-2 text-muted-foreground">— {a.description}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate({ to: basePath as string })}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => { if (selectedAgent) createMutation.mutate(selectedAgent); }}
                  disabled={!selectedAgent || createMutation.isPending}
                >
                  {createMutation.isPending ? "Criando..." : "Iniciar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
