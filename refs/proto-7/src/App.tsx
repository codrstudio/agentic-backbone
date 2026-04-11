import { useEffect, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatArea } from './components/ChatArea'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useChat } from './hooks/useChat'
import { PanelLeft } from 'lucide-react'

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const {
    sessions,
    activeSessionId,
    messages,
    isStreaming,
    models,
    selectedModelId,
    setSelectedModelId,
    loadModels,
    loadSessions,
    loadMessages,
    sendMessage,
    stopStreaming,
    permissionRequest,
    respondToPermission,
  } = useChat()

  useEffect(() => {
    loadModels()
    loadSessions()
  }, [loadModels, loadSessions])

  useEffect(() => {
    if (activeSessionId) {
      loadMessages(activeSessionId)
    }
  }, [activeSessionId, loadMessages])

  const activeSession = sessions.find(s => s.id === activeSessionId) || null

  return (
    <div className="flex flex-col h-screen">
      <div className="flex-1 overflow-hidden bg-bg-100">
        <div className="relative flex h-full overflow-hidden">
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={id => loadMessages(id)}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="absolute top-3 left-3 z-50 p-1.5 text-text-500 hover:text-text-200 bg-bg-000 rounded transition-colors"
              aria-label="Expandir barra lateral"
            >
              <PanelLeft size={16} />
            </button>
          )}

          <ErrorBoundary>
            <ChatArea
              session={activeSession}
              messages={messages}
              isStreaming={isStreaming}
              onSend={sendMessage}
              onStop={stopStreaming}
              permissionRequest={permissionRequest}
              onPermissionRespond={respondToPermission}
              models={models}
              selectedModelId={selectedModelId}
              onModelChange={setSelectedModelId}
            />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  )
}

export default App
