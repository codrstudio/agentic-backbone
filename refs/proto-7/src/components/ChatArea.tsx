import { useEffect, useRef, useMemo } from 'react'
import { Share2 } from 'lucide-react'
import type { Message, Session } from '../types'
import type { ModelOption } from '../hooks/useChat'
import type { PermissionRequest } from '../components/PermissionDialog'
import { MessageBubble } from './MessageBubble'
import { ChatInput } from './ChatInput'
import { ErrorBoundary } from './ErrorBoundary'
import { PermissionDialog } from './PermissionDialog'

interface ChatAreaProps {
  session: Session | null
  messages: Message[]
  isStreaming: boolean
  onSend: (content: string, options?: { images?: { base64: string; mediaType: string; name: string }[]; planMode?: boolean }) => void
  onStop: () => void
  models: ModelOption[]
  selectedModelId: string
  onModelChange: (modelId: string) => void
  permissionRequest: PermissionRequest | null
  onPermissionRespond: (requestId: string, behavior: 'allow' | 'deny' | 'allowForSession') => void
}

interface ProcessedItem {
  type: 'message' | 'tool_group'
  message?: Message
  toolGroup?: { tools: Message[]; results: Message[] }
  key: string
}

/** Group consecutive tool_use + tool_result messages into a single collapsible block */
function processMessages(messages: Message[]): ProcessedItem[] {
  const items: ProcessedItem[] = []
  let i = 0

  while (i < messages.length) {
    const msg = messages[i]

    if (msg.type === 'tool_use') {
      // Collect consecutive tool_use and tool_result
      const tools: Message[] = []
      const results: Message[] = []

      while (i < messages.length && (messages[i].type === 'tool_use' || messages[i].type === 'tool_result')) {
        if (messages[i].type === 'tool_use') tools.push(messages[i])
        else results.push(messages[i])
        i++
      }

      items.push({
        type: 'tool_group',
        toolGroup: { tools, results },
        key: `toolgroup_${tools[0].id}`,
      })
    } else {
      items.push({ type: 'message', message: msg, key: msg.id })
      i++
    }
  }

  return items
}

export function ChatArea({ session, messages, isStreaming, onSend, onStop, models, selectedModelId, onModelChange, permissionRequest, onPermissionRespond }: ChatAreaProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const processed = useMemo(() => processMessages(messages), [messages])

  // Auto-scroll on new messages
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages])

  return (
    <div className="flex-1 flex flex-col h-full bg-bg-000 relative">
      {/* Header */}
      <header className="sticky top-0 z-20">
        <div className="backdrop-blur-md border-b-[0.5px] border-border-300 bg-bg-000/80">
          <div className="px-3 py-2 flex items-center">
            <div className="flex-1 min-w-0 text-sm font-normal">
              {session ? (
                <button className="flex items-center gap-1 text-text-000 hover:text-text-200">
                  <span>{session.name}</span>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-text-500">
                    <path d="M3 5l3 3 3-3" />
                  </svg>
                </button>
              ) : (
                <span className="text-text-400">Selecione uma sessão</span>
              )}
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1 text-xs border border-border-300 rounded-md text-text-200 hover:bg-bg-100 transition-colors">
              <Share2 size={12} />
              <span>Compartilhar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 relative overflow-y-auto overflow-x-hidden overscroll-y-contain">
        <div className="w-full">
          <div className="flex justify-center">
            <div className="w-full max-w-3xl px-8 pt-4 pb-40">
              {processed.map(item => (
                <ErrorBoundary key={item.key}>
                  {item.type === 'tool_group' && item.toolGroup ? (
                    <MessageBubble
                      message={{ id: item.key, role: 'assistant', type: 'tool_use', content: '', timestamp: '' }}
                      toolGroup={item.toolGroup}
                    />
                  ) : item.message && item.message.type !== 'tool_result' ? (
                    <MessageBubble message={item.message} />
                  ) : null}
                </ErrorBoundary>
              ))}

              {/* Permission request dialog */}
              {permissionRequest && (
                <PermissionDialog
                  request={permissionRequest}
                  onRespond={onPermissionRespond}
                />
              )}

              {/* Streaming indicator — asterisk style like original */}
              {isStreaming && (
                <div className="flex items-center gap-1.5 py-3">
                  <span className="text-accent-brand text-lg leading-none animate-pulse">*</span>
                  <span className="text-accent-brand text-[14px] animate-pulse">Processando...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
        models={models}
        selectedModelId={selectedModelId}
        onModelChange={onModelChange}
      />
    </div>
  )
}
