Rotas de Conversas
┌────────┬──────────────────────────────────────────┬────────────────────────────────────────────────────────────┐
│ Método │                  Path                    │                         Descrição                          │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ GET    │ /conversations                           │ Lista conversas do usuário (filtro por agentId)            │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ POST   │ /conversations                           │ Cria conversa (Body: { agentId?, options? } → { session }) │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ GET    │ /conversations/:id                       │ Metadados da conversa (título, starred, agent_id)          │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ GET    │ /conversations/:id/messages              │ Histórico paginado (cursor-based, reverso)                 │
│        │   ?limit=50&before=<cursor>              │ → { messages: SDKMessage[], hasMore, cursor }              │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ POST   │ /conversations/:id/messages              │ Envia mensagem, retorna SSE stream de SDKMessage           │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ PATCH  │ /conversations/:id                       │ Renomear / favoritar ({ title?, starred? })                │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ DELETE │ /conversations/:id                       │ Apagar conversa                                            │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ GET    │ /conversations/:id/attachments/:file     │ Download de anexo                                          │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ GET    │ /conversations/:id/export                │ Exportar conversa (JSON/markdown)                          │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ POST   │ /conversations/:id/takeover              │ Operador assume conversa (backbone only)                   │
├────────┼──────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
│ POST   │ /conversations/:id/release               │ Libera takeover (backbone only)                            │
└────────┴──────────────────────────────────────────┴────────────────────────────────────────────────────────────┘

Mudanças em relação à versão anterior:
- GET /conversations/:id/messages agora é paginado (cursor-based, reverso)
  - limit (default 50, max 200)
  - before (cursor — message id ou timestamp)
  - Response: { messages: SDKMessage[], hasMore: boolean, cursor: string | null }
- POST /conversations/:id/messages retorna SSE stream de SDKMessage (não mais DataStream protocol)
- Takeover/release marcados como backbone only (chat não consome)
