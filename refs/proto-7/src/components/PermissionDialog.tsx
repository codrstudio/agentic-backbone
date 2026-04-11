interface PermissionRequest {
  requestId: string
  toolName: string
  input: Record<string, unknown>
  description?: string
}

interface PermissionDialogProps {
  request: PermissionRequest
  onRespond: (requestId: string, behavior: 'allow' | 'deny' | 'allowForSession') => void
}

function formatInput(input: Record<string, unknown>): string {
  if (input.command) return String(input.command)
  if (input.file_path) return String(input.file_path)
  if (input.content) return String(input.content).substring(0, 200)
  return JSON.stringify(input, null, 2).substring(0, 300)
}

export function PermissionDialog({ request, onRespond }: PermissionDialogProps) {
  const displayInput = formatInput(request.input)

  return (
    <div className="py-3">
      <div className="border border-white/10 rounded-xl bg-bg-100 overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3">
          <p className="text-[14px] text-text-200">
            Permitir que o agente execute{' '}
            <strong className="text-text-000">{request.toolName}</strong>?
          </p>
          {request.description && (
            <p className="text-[12px] text-text-400 mt-0.5">{request.description}</p>
          )}
        </div>

        {/* Command preview */}
        <div className="mx-4 mb-3 bg-bg-200 rounded-lg px-3 py-2">
          <pre className="font-mono text-[13px] text-text-300 whitespace-pre-wrap break-all">
            {displayInput}
          </pre>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-center gap-2 px-4 pb-3">
          <button
            onClick={() => onRespond(request.requestId, 'deny')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-bg-200 hover:bg-bg-300 text-text-200 rounded-md border border-white/10 transition-colors"
          >
            <span>Negar</span>
            <kbd className="text-[10px] bg-bg-300 px-1 py-0.5 rounded text-text-500">Esc</kbd>
          </button>

          <button
            onClick={() => onRespond(request.requestId, 'allowForSession')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-bg-200 hover:bg-bg-300 text-text-200 rounded-md border border-white/10 transition-colors"
          >
            <span>Always allow for session</span>
            <kbd className="text-[10px] bg-bg-300 px-1 py-0.5 rounded text-text-500">Ctrl</kbd>
            <kbd className="text-[10px] bg-bg-300 px-1 py-0.5 rounded text-text-500">Enter</kbd>
          </button>

          <button
            onClick={() => onRespond(request.requestId, 'allow')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] bg-text-000 hover:bg-text-200 text-bg-300 rounded-md transition-colors font-medium"
          >
            <span>Permitir uma vez</span>
            <kbd className="text-[10px] bg-bg-200/30 px-1 py-0.5 rounded text-bg-300/60">Enter</kbd>
          </button>
        </div>
      </div>
    </div>
  )
}

export type { PermissionRequest }
