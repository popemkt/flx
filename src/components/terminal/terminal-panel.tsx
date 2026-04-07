import { useCallback, useRef } from 'react'
import { X, Minus, Terminal as TerminalIcon, Circle } from 'lucide-react'
import { useTerminalStore } from '@/stores/terminal.store'
import { XtermTerminal } from './xterm-terminal'
import { sendMessage } from '@/lib/ws-client'

export function TerminalPanel() {
  const isOpen = useTerminalStore((s) => s.isOpen)
  const height = useTerminalStore((s) => s.height)
  const tabs = useTerminalStore((s) => s.tabs)
  const activeTabId = useTerminalStore((s) => s.activeTabId)
  const setActiveTab = useTerminalStore((s) => s.setActiveTab)
  const removeTab = useTerminalStore((s) => s.removeTab)
  const closePanel = useTerminalStore((s) => s.closePanel)
  const setHeight = useTerminalStore((s) => s.setHeight)

  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragRef.current = { startY: e.clientY, startHeight: height }

      const onMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return
        const delta = dragRef.current.startY - ev.clientY
        setHeight(dragRef.current.startHeight + delta)
      }

      const onMouseUp = () => {
        dragRef.current = null
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.body.style.cursor = 'ns-resize'
      document.body.style.userSelect = 'none'
      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [height, setHeight],
  )

  const onCloseTab = useCallback(
    (e: React.MouseEvent, sessionId: string) => {
      e.stopPropagation()
      // Tell server to kill the session
      sendMessage({ type: 'pty:unsubscribe', sessionId })
      fetch(`/api/v1/pty/sessions/${sessionId}`, { method: 'DELETE' }).catch(() => {})
      removeTab(sessionId)
    },
    [removeTab],
  )

  if (!isOpen || tabs.length === 0) return null

  return (
    <div
      className="border-t bg-[#0a0a0a] flex flex-col shrink-0"
      style={{ height }}
    >
      {/* Resize handle */}
      <div
        className="h-1 cursor-ns-resize hover:bg-primary/30 transition-colors shrink-0"
        onMouseDown={onResizeStart}
      />

      {/* Tab bar */}
      <div className="flex items-center h-8 bg-card border-b px-1 gap-0.5 shrink-0">
        <TerminalIcon className="w-3.5 h-3.5 text-muted-foreground ml-1 mr-1.5" />

        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
          {tabs.map((tab) => (
            <button
              key={tab.sessionId}
              onClick={() => setActiveTab(tab.sessionId)}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs whitespace-nowrap transition-colors ${
                activeTabId === tab.sessionId
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Circle
                className={`w-2 h-2 shrink-0 ${
                  tab.status === 'running'
                    ? 'text-green-400 fill-green-400 animate-pulse'
                    : tab.exitCode === 0
                      ? 'text-zinc-500 fill-zinc-500'
                      : 'text-red-400 fill-red-400'
                }`}
              />
              <span className="truncate max-w-[120px]">{tab.title}</span>
              <span
                onClick={(e) => onCloseTab(e, tab.sessionId)}
                className="hover:bg-muted-foreground/20 rounded p-0.5 -mr-0.5"
              >
                <X className="w-2.5 h-2.5" />
              </span>
            </button>
          ))}
        </div>

        {/* Minimize panel */}
        <button
          onClick={closePanel}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Terminal content */}
      <div className="flex-1 min-h-0 relative">
        {tabs.map((tab) => (
          <XtermTerminal
            key={tab.sessionId}
            sessionId={tab.sessionId}
            isActive={tab.sessionId === activeTabId}
          />
        ))}
      </div>
    </div>
  )
}
