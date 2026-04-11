import { Plus, Clock, ChevronDown, Monitor, PanelLeftClose, SlidersHorizontal } from 'lucide-react'
import type { Session } from '../types'
import { cn } from '../lib/cn'

interface SidebarProps {
  sessions: Session[]
  activeSessionId: string | null
  onSelectSession: (id: string) => void
  collapsed: boolean
  onToggle: () => void
}

function groupByDate(sessions: Session[]) {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const groups: { label: string; sessions: Session[] }[] = []
  const todayGroup: Session[] = []
  const olderGroup: Session[] = []

  for (const s of sessions) {
    const d = new Date(s.lastMessageAt)
    if (d >= today) todayGroup.push(s)
    else olderGroup.push(s)
  }
  if (todayGroup.length) groups.push({ label: 'Hoje', sessions: todayGroup })
  if (olderGroup.length) groups.push({ label: 'Mais antigos', sessions: olderGroup })
  return groups
}

export function Sidebar({ sessions, activeSessionId, onSelectSession, collapsed, onToggle }: SidebarProps) {
  if (collapsed) return null

  const groups = groupByDate(sessions)

  return (
    <div className="flex-shrink-0 w-[280px] bg-bg-200 border-r-[0.5px] border-white/8 h-full flex flex-col">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[17px] font-semibold tracking-tight text-text-000">Claude Code</span>
          <span className="text-[10px] px-1.5 py-[2px] rounded-sm bg-bg-000/60 text-text-400 border border-white/8">
            Prévia de pesquisa
          </span>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 text-text-500 hover:text-text-200 hover:bg-white/5 rounded transition-colors"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Actions */}
      <div className="px-3 flex flex-col gap-0.5">
        <button className="flex items-center gap-2.5 px-2.5 py-2 text-[14px] text-text-200 hover:bg-white/5 rounded-md transition-colors">
          <Plus size={16} className="text-text-400" />
          <span>Nova sessão</span>
        </button>
        <button className="flex items-center gap-2.5 px-2.5 py-2 text-[14px] text-text-400 hover:bg-white/5 rounded-md transition-colors">
          <Clock size={16} />
          <span>Programado</span>
        </button>
      </div>

      {/* Project filter */}
      <div className="px-3 py-3 flex items-center justify-between">
        <button className="flex items-center gap-1 text-[13px] text-text-400 hover:text-text-200 transition-colors">
          <span>Todos os projetos</span>
          <ChevronDown size={12} />
        </button>
        <button className="p-1 text-text-500 hover:text-text-200 hover:bg-white/5 rounded transition-colors">
          <SlidersHorizontal size={14} />
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-2">
        {groups.map(group => (
          <div key={group.label} className="mb-1">
            <div className="px-2.5 py-1.5 text-[12px] text-text-500">{group.label}</div>
            {group.sessions.map(session => (
              <button
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={cn(
                  'w-full text-left px-2.5 py-2 rounded-md text-[13px] transition-colors flex items-center gap-2',
                  session.id === activeSessionId
                    ? 'bg-bg-000 text-text-000'
                    : 'text-text-300 hover:bg-white/5'
                )}
              >
                <span className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  session.id === activeSessionId ? 'bg-green-400' : 'bg-text-500/30'
                )} />
                <span className="truncate flex-1">{session.name}</span>
                <Monitor size={13} className="flex-shrink-0 text-text-500/60" />
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom: desktop banner */}
      <div className="px-3 py-3 mt-auto">
        <div className="bg-bg-000/50 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-bg-300/60 flex items-center justify-center">
            <Monitor size={14} className="text-text-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-text-200 leading-tight">Experimente o Claude Code</div>
            <div className="text-[11px] text-text-500 leading-tight">no desktop</div>
          </div>
        </div>
      </div>

      {/* User avatar */}
      <div className="px-3 pb-3">
        <div className="w-7 h-7 rounded-full bg-accent-brand/80 flex items-center justify-center text-[11px] font-medium text-white">
          GC
        </div>
      </div>
    </div>
  )
}
