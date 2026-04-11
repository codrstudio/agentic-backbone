import { useState, useRef, useCallback } from 'react'
import { Plus, ArrowUp, Square, ChevronDown, ImagePlus, Map, X } from 'lucide-react'
import type { ModelOption } from '../hooks/useChat'

export interface ImageAttachment {
  base64: string
  mediaType: string
  name: string
  preview: string // data URL for thumbnail
}

interface ChatInputProps {
  onSend: (content: string, options?: { images?: ImageAttachment[]; planMode?: boolean }) => void
  onStop: () => void
  isStreaming: boolean
  models: ModelOption[]
  selectedModelId: string
  onModelChange: (modelId: string) => void
}

export function ChatInput({ onSend, onStop, isStreaming, models, selectedModelId, onModelChange }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [showModelMenu, setShowModelMenu] = useState(false)
  const [showPlusMenu, setShowPlusMenu] = useState(false)
  const [planMode, setPlanMode] = useState(false)
  const [images, setImages] = useState<ImageAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const selectedModel = models.find(m => m.id === selectedModelId)

  const handleSubmit = useCallback(() => {
    const trimmed = value.trim()
    if ((!trimmed && images.length === 0) || isStreaming) return
    onSend(trimmed || '(imagem anexada)', { images: images.length > 0 ? images : undefined, planMode: planMode || undefined })
    setValue('')
    setImages([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [value, isStreaming, onSend, images, planMode])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }, [handleSubmit])

  const handleInput = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        // Extract base64 from data URL
        const base64 = dataUrl.split(',')[1]
        setImages(prev => [...prev, {
          base64,
          mediaType: file.type,
          name: file.name,
          preview: dataUrl,
        }])
      }
      reader.readAsDataURL(file)
    }
    // Reset input so the same file can be selected again
    e.target.value = ''
  }, [])

  const removeImage = useCallback((idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }, [])

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-bg-000 px-4 pb-4" style={{ overflow: 'visible' }}>
      <div className="max-w-3xl mx-auto">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="bg-bg-000 border border-border-300 rounded-xl" style={{ overflow: 'visible' }}>
          {/* Image previews */}
          {images.length > 0 && (
            <div className="px-3 pt-3 flex gap-2 flex-wrap">
              {images.map((img, idx) => (
                <div key={idx} className="relative group/img">
                  <img
                    src={img.preview}
                    alt={img.name}
                    className="w-16 h-16 object-cover rounded-lg border border-white/10"
                  />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg-300 border border-white/10 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                  >
                    <X size={10} className="text-text-200" />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[9px] text-text-300 px-1 py-0.5 rounded-b-lg truncate">
                    {img.name}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="px-4 pt-3 pb-2">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={e => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder="Responder..."
              rows={1}
              className="w-full bg-transparent text-text-000 placeholder:text-text-500 text-[15px] resize-none outline-none"
            />
          </div>

          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-0.5">
              {/* Plus menu */}
              <div className="relative">
                <button
                  onClick={() => setShowPlusMenu(!showPlusMenu)}
                  className="p-1.5 text-text-500 hover:text-text-200 hover:bg-white/5 rounded transition-colors"
                >
                  <Plus size={18} />
                </button>

                {showPlusMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPlusMenu(false)} />
                    <div className="absolute bottom-full left-0 mb-1 z-50 bg-bg-200 border border-white/10 rounded-lg shadow-xl py-1 min-w-[180px]">
                      <button
                        onClick={() => {
                          fileInputRef.current?.click()
                          setShowPlusMenu(false)
                        }}
                        className="w-full text-left px-3 py-2 text-[13px] text-text-200 hover:bg-white/5 flex items-center gap-2.5 transition-colors"
                      >
                        <ImagePlus size={16} className="text-text-400" />
                        <span>Adicionar imagem</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Plan mode toggle */}
              <button
                onClick={() => setPlanMode(!planMode)}
                className={`p-1.5 rounded transition-colors flex items-center gap-1.5 ${
                  planMode
                    ? 'text-accent-brand bg-accent-brand/10'
                    : 'text-text-500 hover:text-text-200 hover:bg-white/5'
                }`}
                title="Modo de planejamento"
              >
                <Map size={16} />
                {planMode && <span className="text-[11px] font-medium">Modo de planejamento</span>}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Model selector */}
              <div className="relative">
                <button
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  className="flex items-center gap-1 text-xs text-text-400 hover:text-text-200 transition-colors px-2 py-1 rounded hover:bg-white/5"
                >
                  <span>{selectedModel?.label || 'Modelo'}</span>
                  <ChevronDown size={12} />
                </button>

                {showModelMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowModelMenu(false)} />
                    <div className="absolute bottom-full right-0 mb-1 z-50 bg-bg-200 border border-white/10 rounded-lg shadow-xl py-1 min-w-[240px] max-h-[400px] overflow-y-auto">
                      {models.map(model => (
                        <button
                          key={model.id}
                          onClick={() => {
                            onModelChange(model.id)
                            setShowModelMenu(false)
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${
                            model.id === selectedModelId
                              ? 'text-text-000 bg-white/5'
                              : 'text-text-300 hover:bg-white/5 hover:text-text-200'
                          }`}
                        >
                          <div className="font-medium">{model.label}</div>
                          <div className="text-text-500 text-[10px] mt-0.5">{model.id}</div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Send / Stop button */}
              {isStreaming ? (
                <button
                  onClick={onStop}
                  className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors"
                  title="Interromper"
                >
                  <Square size={12} className="text-white" fill="white" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!value.trim() && images.length === 0}
                  className="w-8 h-8 rounded-lg bg-accent-brand hover:bg-accent-brand/80 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                >
                  <ArrowUp size={16} className="text-white" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
