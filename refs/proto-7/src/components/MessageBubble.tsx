import { Copy, Check } from 'lucide-react'
import { useState, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Message } from '../types'
import { ToolUseBlock } from './ToolUseBlock'

interface MessageBubbleProps {
  message: Message
  toolGroup?: { tools: Message[]; results: Message[] }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [text])

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 p-1 text-text-500 hover:text-text-200 opacity-0 group-hover/message:opacity-100 pointer-events-none group-hover/message:pointer-events-auto transition-opacity rounded hover:bg-white/5"
      aria-label="Copiar mensagem"
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

function CodeBlock({ children, className }: { children: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const lang = className?.replace('language-', '') || ''

  return (
    <div className="relative group/code !my-3">
      <div className="border-[0.5px] border-white/8 bg-white/[0.02] rounded-md overflow-hidden">
        {/* Language label */}
        {lang && (
          <div className="px-3 py-1 text-[11px] text-text-500 border-b border-white/5 bg-white/[0.02]">
            {lang}
          </div>
        )}
        <div className="p-3 overflow-x-auto">
          <pre className="!my-0 !p-0">
            <code className={`language-${lang} text-[13px] leading-[1.55] font-mono text-text-200`}>
              {children}
            </code>
          </pre>
        </div>
      </div>
      <div className="absolute top-1.5 right-1.5 flex opacity-0 group-hover/code:opacity-100 transition-opacity">
        <button
          onClick={() => {
            navigator.clipboard.writeText(children)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="p-1.5 rounded bg-bg-300/80 hover:bg-bg-200 text-text-400 hover:text-text-200 transition-colors backdrop-blur-sm"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
    </div>
  )
}

function safeContent(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return val
  if (Array.isArray(val)) return val.map(safeContent).join('\n')
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (obj.text) return safeContent(obj.text)
    return JSON.stringify(val)
  }
  return String(val)
}

export function MessageBubble({ message, toolGroup }: MessageBubbleProps) {
  const content = safeContent(message.content)

  // System messages — subtle, left-aligned
  if (message.role === 'system') {
    return (
      <div className="py-2 message-turn">
        <div className="group/message flex items-start gap-2">
          <CopyButton text={content} />
          <p className="text-text-500 text-[13px]">{content}</p>
        </div>
      </div>
    )
  }

  // User messages — right-aligned dark bubble
  if (message.role === 'user') {
    return (
      <div className="py-3 flex justify-end message-turn">
        <div className="max-w-[85%] flex flex-col items-end gap-2">
          {/* Image thumbnails — shown above text like the original */}
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-end">
              {message.images.map((img, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-bg-200 rounded-lg px-2.5 py-1.5">
                  <img
                    src={img.preview}
                    alt={img.name}
                    className="w-5 h-5 object-cover rounded"
                  />
                  <span className="text-[13px] text-text-300">{img.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className="group/message flex items-start gap-1.5">
            <div className="bg-bg-200 rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed text-text-000">
              {content}
            </div>
            <div className="shrink-0 mt-2">
              <CopyButton text={content} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Tool use group
  if (toolGroup) {
    return (
      <div className="py-2 message-turn">
        <ToolUseBlock tools={toolGroup.tools} results={toolGroup.results} />
      </div>
    )
  }

  // Assistant text — left-aligned, full markdown
  return (
    <div className="py-2 message-turn">
      <div className="group/message flex items-start gap-2">
        <div className="shrink-0 mt-0.5">
          <CopyButton text={content} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="prose-chat">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children }) {
                  const isBlock = className?.startsWith('language-')
                  if (isBlock) {
                    return <CodeBlock className={className}>{String(children).replace(/\n$/, '')}</CodeBlock>
                  }
                  return <code className={className}>{children}</code>
                },
                pre({ children }) {
                  return <>{children}</>
                },
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
