export interface Session {
  id: string
  name: string
  createdAt: string
  lastMessageAt: string
}

export interface MessageImage {
  preview: string // data URL for display
  name: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  type: 'text' | 'tool_use' | 'tool_result'
  content: string
  toolName?: string
  toolInput?: string
  toolOutput?: string
  images?: MessageImage[]
  timestamp: string
}

export interface ToolUseGroup {
  tools: Message[]
  results: Map<string, Message>
}

// SSE event types from server
export type SSEEvent =
  | { event: 'message_start'; data: { messageId: string } }
  | { event: 'text_delta'; data: { text: string } }
  | { event: 'tool_use_start'; data: { id: string; name: string; input: string } }
  | { event: 'tool_use_output'; data: { id: string; output: string } }
  | { event: 'tool_use_end'; data: { id: string } }
  | { event: 'message_end'; data: { messageId: string } }
