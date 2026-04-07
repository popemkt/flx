import { CanvasView } from '@/canvas/canvas-view'
import { useRunWorkflow } from '@/hooks/use-execution'
import { useExecutionStore } from '@/stores/execution.store'
import { useTerminalStore } from '@/stores/terminal.store'
import { CommandPalette } from '@/components/command-palette/command-palette'
import { TerminalPanel } from '@/components/terminal/terminal-panel'
import { useCommandPaletteStore } from '@/stores/command-palette.store'
import { usePersistence } from '@/hooks/use-persistence'
import { Play, Square, Command, Terminal } from 'lucide-react'
import { useEffect } from 'react'

export function AppShell() {
  usePersistence()
  const { run, status } = useRunWorkflow()
  const reset = useExecutionStore((s) => s.reset)
  const openPalette = useCommandPaletteStore((s) => s.open)
  const toggleTerminal = useTerminalStore((s) => s.togglePanel)
  const terminalTabs = useTerminalStore((s) => s.tabs)
  const terminalOpen = useTerminalStore((s) => s.isOpen)

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        openPalette()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        run()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '`') {
        e.preventDefault()
        toggleTerminal()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [openPalette, run, toggleTerminal])

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden">
      {/* Top bar */}
      <header className="h-10 flex items-center px-4 border-b bg-card shrink-0 gap-2">
        <span className="text-sm font-semibold tracking-tight">flx</span>
        <span className="text-xs text-muted-foreground">workflow builder</span>

        <div className="flex-1" />

        {/* Terminal toggle */}
        <button
          onClick={toggleTerminal}
          className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
            terminalOpen
              ? 'text-foreground bg-muted'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <Terminal className="w-3 h-3" />
          <span>Ctrl+`</span>
          {terminalTabs.length > 0 && (
            <span className="bg-muted-foreground/30 text-muted-foreground rounded-full px-1 text-[10px] min-w-[16px] text-center">
              {terminalTabs.length}
            </span>
          )}
        </button>

        {/* Command palette trigger */}
        <button
          onClick={openPalette}
          className="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Command className="w-3 h-3" />
          <span>Ctrl+K</span>
        </button>

        {/* Run / Stop */}
        {status === 'running' ? (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
          >
            <Square className="w-3 h-3" />
            Stop
          </button>
        ) : (
          <button
            onClick={run}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
          >
            <Play className="w-3 h-3" />
            Run
          </button>
        )}
      </header>

      {/* Canvas */}
      <main className="flex-1 min-h-0">
        <CanvasView />
      </main>

      {/* Terminal Panel */}
      <TerminalPanel />

      {/* Command Palette */}
      <CommandPalette />
    </div>
  )
}
