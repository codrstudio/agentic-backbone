import { useState, useCallback, useMemo } from "react";
import { useNavigate, Outlet, useRouterState } from "@tanstack/react-router";
import {
  History,
  ChatHeader,
  HistoryProvider,
  HistoryTrigger,
  createDefaultTransport,
  useIsMobile,
  useHistoryContext,
  type Message,
  type Conversation as ChatConversation,
  convertSDKMessages,
} from "@codrstudio/openclaude-chat";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";

interface ConversationsLayoutProps {
  fixedAgentId: string;
  basePath: string;
}

export function ConversationsLayout({ fixedAgentId, basePath }: ConversationsLayoutProps) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Extract active conversation ID from URL
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const convIdMatch = pathname.match(/\/conversations\/([^/]+)$/);
  const activeId = convIdMatch?.[1] ?? null;

  // State for loaded messages and conversation metadata
  const [loadedMessages, setLoadedMessages] = useState<Message[]>([]);
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);

  const transport = useMemo(
    () => createDefaultTransport("/api/v1/ai", ""),
    [],
  );

  const handleSelect = useCallback((id: string) => {
    Promise.all([
      transport.getMessages(id),
      transport.getConversation(id),
    ]).then(([result, conv]) => {
      setLoadedMessages(convertSDKMessages(result.messages));
      setActiveConv(conv);
      navigate({ to: `${basePath}/${id}` as string });
    });
  }, [transport, basePath, navigate]);

  const handleNew = useCallback((id: string) => {
    setLoadedMessages([]);
    transport.getConversation(id).then(setActiveConv);
    navigate({ to: `${basePath}/${id}` as string });
  }, [transport, basePath, navigate]);

  const handleDelete = useCallback((id: string) => {
    if (activeId === id) {
      setActiveConv(null);
      navigate({ to: basePath as string });
    }
  }, [activeId, basePath, navigate]);

  const handleToggleStar = useCallback(() => {
    if (!activeId || !activeConv) return;
    const newStarred = !activeConv.starred;
    transport.updateConversation(activeId, { starred: newStarred }).then(() => {
      setActiveConv((prev) => prev ? { ...prev, starred: newStarred } : prev);
    });
  }, [activeId, activeConv, transport]);

  const handleRename = useCallback((newTitle: string) => {
    if (!activeId) return;
    transport.updateConversation(activeId, { title: newTitle }).then(() => {
      setActiveConv((prev) => prev ? { ...prev, title: newTitle } : prev);
    });
  }, [activeId, transport]);

  return (
    <HistoryProvider
      transport={transport}
      agentId={fixedAgentId}
      activeConversationId={activeId}
      onActiveChange={(id) => {
        if (id) navigate({ to: `${basePath}/${id}` as string });
        else navigate({ to: basePath as string });
      }}
    >
      <div className="flex h-[calc(100vh-theme(spacing.14)-2rem)] flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0">
          {/* Desktop sidebar */}
          {!isMobile && <DesktopSidebar onSelect={handleSelect} onNew={handleNew} onDelete={handleDelete} activeId={activeId} />}

          {/* Mobile drawer */}
          {isMobile && <MobileDrawer onSelect={handleSelect} onNew={handleNew} onDelete={handleDelete} activeId={activeId} />}

          {/* Chat area */}
          <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
            <ChatHeader
              leftContent={<HistoryTrigger />}
              title={activeConv?.title}
              starred={activeConv?.starred}
              onToggleStar={handleToggleStar}
              onRename={handleRename}
              enableLocaleSelect={false}
            />
            <main className="flex-1 min-h-0 overflow-hidden">
              <Outlet />
            </main>
          </div>
        </div>
      </div>
    </HistoryProvider>
  );
}

// ── Sidebar subcomponents ────────────────────────────────────

interface SidebarCallbacks {
  onSelect: (id: string) => void;
  onNew: (id: string) => void;
  onDelete: (id: string) => void;
  activeId: string | null;
}

function DesktopSidebar({ onSelect, onNew, onDelete, activeId }: SidebarCallbacks) {
  const { sidebarOpen } = useHistoryContext();
  if (!sidebarOpen) return null;
  return (
    <History
      activeConversationId={activeId}
      onSelectConversation={onSelect}
      onNewConversation={onNew}
      onDeleteConversation={onDelete}
      locale="pt-BR"
    />
  );
}

function MobileDrawer({ onSelect, onNew, onDelete, activeId }: SidebarCallbacks) {
  const { sidebarOpen, setSidebarOpen } = useHistoryContext();
  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetTitle className="sr-only">Histórico de conversas</SheetTitle>
        <History
          activeConversationId={activeId}
          onSelectConversation={(id) => {
            onSelect(id);
            setSidebarOpen(false);
          }}
          onNewConversation={(id) => {
            onNew(id);
            setSidebarOpen(false);
          }}
          onDeleteConversation={onDelete}
          locale="pt-BR"
        />
      </SheetContent>
    </Sheet>
  );
}
