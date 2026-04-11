import { useState, useCallback, useRef } from 'react'
import type { Message, Session } from '../types'
import type { PermissionRequest } from '../components/PermissionDialog'

export interface ModelOption {
  id: string
  label: string
}

export type { PermissionRequest }

export function useChat() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [models, setModels] = useState<ModelOption[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string>('')
  const [permissionRequest, setPermissionRequest] = useState<PermissionRequest | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const loadModels = useCallback(async () => {
    try {
      const res = await fetch('/api/models')
      const data = await res.json()
      setModels(data)
      if (data.length > 0 && !selectedModelId) {
        setSelectedModelId(data[0].id)
      }
    } catch (err) {
      console.error('Failed to load models:', err)
    }
  }, [selectedModelId])

  const loadSessions = useCallback(async () => {
    const res = await fetch('/api/sessions')
    const data = await res.json()
    setSessions(data)
    if (data.length > 0 && !activeSessionId) {
      setActiveSessionId(data[0].id)
    }
  }, [activeSessionId])

  const loadMessages = useCallback(async (sessionId: string) => {
    setActiveSessionId(sessionId)
    // proto-1 doesn't persist messages server-side
    // CLI handles history via --resume, messages live in React state
  }, [])

  // Safely coerce any value to a renderable string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function safeString(val: any): string {
    if (val == null) return ''
    if (typeof val === 'string') return val
    if (Array.isArray(val)) {
      // CLI sometimes returns content as [{type:"text", text:"..."}]
      return val.map((item) => {
        if (typeof item === 'string') return item
        if (item?.text) return item.text
        return JSON.stringify(item)
      }).join('\n')
    }
    if (typeof val === 'object') {
      if (val.text) return val.text
      return JSON.stringify(val)
    }
    return String(val)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEvent = useCallback((eventType: string, data: any) => {
    try {
      switch (eventType) {
        case 'system':
          if (data.subtype === 'init') {
            setMessages(prev => {
              if (prev.some(m => m.id === 'system_init')) return prev
              return [...prev, {
                id: 'system_init',
                role: 'system' as const,
                type: 'text' as const,
                content: `Conectado (${safeString(data.model) || 'claude'})`,
                timestamp: new Date().toISOString(),
              }]
            })
          }
          break

        case 'assistant': {
          const msg = data.message
          if (!msg?.content) break
          const blocks = Array.isArray(msg.content) ? msg.content : [msg.content]

          for (const block of blocks) {
            if (block.type === 'text') {
              setMessages(prev => [...prev, {
                id: msg.id + '_text_' + Date.now(),
                role: 'assistant' as const,
                type: 'text' as const,
                content: safeString(block.text),
                timestamp: new Date().toISOString(),
              }])
            } else if (block.type === 'tool_use') {
              const input = block.input
              const displayInput = safeString(
                input?.command || input?.file_path || input?.pattern || input?.content || input
              ).substring(0, 500)

              setMessages(prev => [...prev, {
                id: block.id || `tool_${Date.now()}`,
                role: 'assistant' as const,
                type: 'tool_use' as const,
                content: '',
                toolName: safeString(block.name),
                toolInput: displayInput,
                timestamp: new Date().toISOString(),
              }])
            }
          }
          break
        }

        case 'user': {
          const msg = data.message
          if (!msg?.content) break
          const blocks = Array.isArray(msg.content) ? msg.content : [msg.content]

          for (const block of blocks) {
            if (block.type === 'tool_result') {
              const output = safeString(
                data.tool_use_result?.stdout ?? block.content ?? ''
              )
              setMessages(prev => [...prev, {
                id: (block.tool_use_id || `tr_${Date.now()}`) + '_result',
                role: 'assistant' as const,
                type: 'tool_result' as const,
                content: output,
                toolOutput: output,
                timestamp: new Date().toISOString(),
              }])
            }
          }
          break
        }

        case 'control_request': {
          // Permission request from CLI
          const req = data.request
          if (req?.subtype === 'can_use_tool') {
            setPermissionRequest({
              requestId: data.request_id,
              toolName: req.tool_name || 'Unknown',
              input: req.input || {},
              description: req.description,
            })
          }
          break
        }

        default:
          break
      }
    } catch (err) {
      console.error('[useChat] Error handling event:', eventType, err)
    }
  }, [])

  const sendMessage = useCallback(async (
    content: string,
    options?: { images?: { base64: string; mediaType: string; name: string }[]; planMode?: boolean }
  ) => {
    if (!activeSessionId || isStreaming) return

    const userMsg: Message = {
      id: `msg_user_${Date.now()}`,
      role: 'user',
      type: 'text',
      content,
      images: options?.images?.map(img => ({
        preview: `data:${img.mediaType};base64,${img.base64}`,
        name: img.name,
      })),
      timestamp: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMsg])
    setIsStreaming(true)

    const abort = new AbortController()
    abortRef.current = abort

    try {
      const res = await fetch(`/api/sessions/${activeSessionId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          modelId: selectedModelId || undefined,
          planMode: options?.planMode || undefined,
          images: options?.images?.map(img => ({ base64: img.base64, mediaType: img.mediaType })),
        }),
        signal: abort.signal,
      })

      if (!res.ok || !res.body) throw new Error('Stream failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let eventType = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            const raw = line.slice(6)
            try {
              const data = JSON.parse(raw)
              handleEvent(eventType, data)
            } catch {
              // skip
            }
            eventType = ''
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('Stream error:', err)
      }
    } finally {
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [activeSessionId, isStreaming, handleEvent, selectedModelId])

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setPermissionRequest(null)
  }, [])

  const respondToPermission = useCallback(async (
    requestId: string,
    behavior: 'allow' | 'deny' | 'allowForSession'
  ) => {
    if (!activeSessionId) return
    setPermissionRequest(null)
    try {
      await fetch(`/api/sessions/${activeSessionId}/permission`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, behavior }),
      })
    } catch (err) {
      console.error('Permission response error:', err)
    }
  }, [activeSessionId])

  return {
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
    setActiveSessionId,
    permissionRequest,
    respondToPermission,
  }
}
