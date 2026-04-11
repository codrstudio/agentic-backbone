import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import type { Message } from '../types'

interface ToolUseBlockProps {
  tools: Message[]
  results: Message[]
}

function safe(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map(safe).join('\n')
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>
    if (o.text) return safe(o.text)
    return JSON.stringify(val)
  }
  return String(val)
}

export function ToolUseBlock({ tools, results }: ToolUseBlockProps) {
  const [expanded, setExpanded] = useState(false)
  const count = tools.length
  const label = count === 1
    ? `${safe(tools[0].toolName)} ${safe(tools[0].toolInput).substring(0, 60)}`
    : `Executou ${count} comandos`

  // Pair tools with results by sequential order
  const resultMap = new Map<string, Message>()
  for (let i = 0; i < tools.length; i++) {
    if (results[i]) resultMap.set(tools[i].id, results[i])
  }

  return (
    <div className="min-w-0">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 py-1.5 text-text-400 hover:text-text-200 transition-colors"
        aria-expanded={expanded}
      >
        <ChevronRight
          size={14}
          className="shrink-0 chevron-rotate"
          data-expanded={expanded}
        />
        <span className="text-[13px]">{label}</span>
      </button>

      {/* Expanded tool list — grid-row animation */}
      <div className="tool-expand" data-expanded={expanded}>
        <div>
          <div className="ml-1 pl-4 border-l border-white/8">
            {tools.map((tool, idx) => {
              const result = resultMap.get(tool.id)
              const output = safe(result?.toolOutput || result?.content)
              const isLast = idx === tools.length - 1

              return (
                <div key={tool.id} className={isLast ? 'pb-1' : 'pb-3'}>
                  {/* Tool header: name + command */}
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-text-300 text-[13px] shrink-0 font-medium">
                      {safe(tool.toolName)}
                    </span>
                    <span className="font-mono text-[12px] text-text-400 bg-white/[0.04] px-1.5 py-0.5 rounded truncate max-w-full">
                      {safe(tool.toolInput)}
                    </span>
                  </div>

                  {/* Tool output */}
                  {output && (
                    <div className="mt-1.5 ml-0 font-mono text-[12px] leading-[1.5] text-text-500 max-h-[120px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words">{output}</pre>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
