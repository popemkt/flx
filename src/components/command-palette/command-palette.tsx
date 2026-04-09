import { Command } from 'cmdk'
import { useCommandPaletteStore } from '@/stores/command-palette.store'
import { getAllDefinitions } from '@/canvas/node-types-registry'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useRunWorkflow } from '@/hooks/use-execution'
import { useCanvasStore } from '@/stores/canvas.store'
import { useTerminalStore } from '@/stores/terminal.store'
import { nanoid } from 'nanoid'
import { useMemo } from 'react'
import type { FlxNodeDefinition } from '@/types/node'
import { Play, Plus, Minimize2, Maximize2, Terminal, History, Trash2, Copy } from 'lucide-react'

const groupHeadingClass =
  '[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider'
const itemClass =
  'flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer text-foreground data-[selected=true]:bg-accent'

function getSpawnOffset(index: number) {
  return {
    x: (index % 4) * 36,
    y: Math.floor(index / 4) * 28,
  }
}

export function CommandPalette() {
  const isOpen = useCommandPaletteStore((s) => s.isOpen)
  const close = useCommandPaletteStore((s) => s.close)
  const addNode = useWorkflowStore((s) => s.addNode)
  const nodes = useWorkflowStore((s) => s.nodes)
  const removeNode = useWorkflowStore((s) => s.removeNode)
  const viewport = useCanvasStore((s) => s.viewport)
  const viewMode = useCanvasStore((s) => s.viewMode)
  const toggleViewMode = useCanvasStore((s) => s.toggleViewMode)
  const setSelectedNodeForConfig = useCanvasStore((s) => s.setSelectedNodeForConfig)
  const toggleTerminal = useTerminalStore((s) => s.togglePanel)
  const { run } = useRunWorkflow()
  const definitions = useMemo<FlxNodeDefinition[]>(
    () => (isOpen ? getAllDefinitions() : []),
    [isOpen],
  )

  const handleAddNode = (def: FlxNodeDefinition) => {
    const id = nanoid()
    const offset = getSpawnOffset(nodes.length)
    addNode({
      id,
      type: def.id,
      position: {
        x: -viewport.x + 400 + offset.x,
        y: -viewport.y + 300 + offset.y,
      },
      data: {
        definition: def,
        config: def.defaultConfig ? { ...def.defaultConfig } : {},
        label: def.name,
        workflowId: 'default',
      },
    })
    close()
  }

  const handleDuplicateNode = (nodeId: string) => {
    const original = nodes.find((n) => n.id === nodeId)
    if (!original) return
    const id = nanoid()
    addNode({
      id,
      type: original.type!,
      position: { x: original.position.x + 40, y: original.position.y + 40 },
      data: {
        ...original.data,
        config: { ...original.data.config },
      },
    })
    close()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/50" onClick={close} />

      <Command
        data-testid="command-palette"
        className="relative w-[480px] rounded-lg border bg-popover shadow-2xl overflow-hidden"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') close()
        }}
      >
        <Command.Input
          data-testid="command-palette-input"
          placeholder="Search commands..."
          className="w-full px-4 py-3 text-sm bg-transparent border-b outline-none placeholder:text-muted-foreground text-foreground"
          autoFocus
        />
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">
            No commands found.
          </Command.Empty>

          <Command.Group heading="Workflow" className={groupHeadingClass}>
            <Command.Item
              onSelect={() => { run(); close() }}
              className={itemClass}
            >
              <Play className="w-4 h-4 text-green-500" />
              Run Workflow
              <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+Enter</span>
            </Command.Item>
            <Command.Item
              onSelect={() => { toggleViewMode(); close() }}
              className={itemClass}
            >
              {viewMode === 'compact' ? (
                <Maximize2 className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Minimize2 className="w-4 h-4 text-muted-foreground" />
              )}
              Switch to {viewMode === 'compact' ? 'Expanded' : 'Compact'} View
              <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+M</span>
            </Command.Item>
            <Command.Item
              onSelect={() => { toggleTerminal(); close() }}
              className={itemClass}
            >
              <Terminal className="w-4 h-4 text-muted-foreground" />
              Toggle Terminal
              <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+`</span>
            </Command.Item>
            <Command.Item
              value="execution history"
              onSelect={() => close()}
              className={itemClass}
            >
              <History className="w-4 h-4 text-muted-foreground" />
              Execution History
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Add Node" className={groupHeadingClass}>
            {definitions.map((def) => (
              <Command.Item
                key={def.id}
                value={`add ${def.name} ${def.category}`}
                onSelect={() => handleAddNode(def)}
                className={itemClass}
              >
                <Plus className="w-4 h-4" style={{ color: def.color }} />
                {def.name}
                <span className="ml-auto text-[10px] text-muted-foreground">{def.category}</span>
              </Command.Item>
            ))}
          </Command.Group>

          {/* Navigate to existing nodes */}
          {nodes.length > 0 && (
            <Command.Group heading="Go to Node" className={groupHeadingClass}>
              {nodes.map((n) => (
                <Command.Item
                  key={`goto-${n.id}`}
                  value={`go to ${n.data.label} ${n.data.definition.name}`}
                  onSelect={() => { setSelectedNodeForConfig(n.id); close() }}
                  className={itemClass}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: n.data.definition.color }}
                  />
                  {n.data.label}
                  <span className="ml-auto text-[10px] text-muted-foreground">{n.data.definition.name}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {/* Duplicate / Delete nodes */}
          {nodes.length > 0 && (
            <Command.Group heading="Node Actions" className={groupHeadingClass}>
              {nodes.map((n) => (
                <Command.Item
                  key={`dup-${n.id}`}
                  value={`duplicate ${n.data.label} ${n.data.definition.name}`}
                  onSelect={() => handleDuplicateNode(n.id)}
                  className={itemClass}
                >
                  <Copy className="w-4 h-4 text-muted-foreground" />
                  Duplicate "{n.data.label}"
                </Command.Item>
              ))}
              {nodes.map((n) => (
                <Command.Item
                  key={`del-${n.id}`}
                  value={`delete remove ${n.data.label} ${n.data.definition.name}`}
                  onSelect={() => { removeNode(n.id); close() }}
                  className={itemClass}
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                  Delete "{n.data.label}"
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>
      </Command>
    </div>
  )
}
