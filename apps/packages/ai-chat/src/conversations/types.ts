export interface Conversation {
  id: string;
  title?: string;
  agentId: string;
  updatedAt: string;
  starred: boolean;
  metadata?: Record<string, unknown>;
}

export interface BackendMessage {
  id?: string;
  role: string;
  content: string | unknown[];
  _meta?: { id?: string; ts?: string; userId?: string; metadata?: Record<string, unknown> };
  timestamp?: string;
  metadata?: Record<string, unknown>;
}
