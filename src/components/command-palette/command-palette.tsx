import { Command } from 'cmdk'
import { useCommandPaletteStore } from '@/stores/command-palette.store'
import { getAllDefinitions } from '@/canvas/node-types-registry'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useRunWorkflow } from '@/hooks/use-execution'
import { useCanvasStore } from '@/stores/canvas.store'
import { nanoid } from 'nanoid'
import { useEffect, useState } from 'react'
import type { FlxNodeDefinition } from '@/types/node'
import { Play, Plus } from 'lucide-react'

export function CommandPalette() {
  const isOpen = useCommandPaletteStore((s) => s.isOpen)
  const close = useCommandPaletteStore((s) => s.close)
  const addNode = useWorkflowStore((s) => s.addNode)
  const viewport = useCanvasStore((s) => s.viewport)
  const { run } = useRunWorkflow()
  const [definitions, setDefinitions] = useState<FlxNodeDefinition[]>([])

  useEffect(() => {
    if (isOpen) {
      setDefinitions(getAllDefinitions())
    }
  }, [isOpen])

  const handleAddNode = (def: FlxNodeDefinition) => {
    const id = nanoid()
    addNode({
      id,
      type: def.id,
      position: {
        x: -viewport.x + 400 + Math.random() * 100,
        y: -viewport.y + 300 + Math.random() * 100,
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

  const handleRunWorkflow = () => {
    run()
    close()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={close} />

      {/* Palette */}
      <Command
        className="relative w-[480px] rounded-lg border bg-popover shadow-2xl overflow-hidden"
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Escape') close()
        }}
      >
        <Command.Input
          placeholder="Search commands..."
          className="w-full px-4 py-3 text-sm bg-transparent border-b outline-none placeholder:text-muted-foreground text-foreground"
          autoFocus
        />
        <Command.List className="max-h-[300px] overflow-y-auto p-2">
          <Command.Empty className="px-4 py-6 text-center text-sm text-muted-foreground">
            No commands found.
          </Command.Empty>

          <Command.Group heading="Workflow" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
            <Command.Item
              onSelect={handleRunWorkflow}
              className="flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer text-foreground data-[selected=true]:bg-accent"
            >
              <Play className="w-4 h-4 text-green-500" />
              Run Workflow
              <span className="ml-auto text-[10px] text-muted-foreground">Ctrl+Enter</span>
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Add Node" className="[&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider">
            {definitions.map((def) => (
              <Command.Item
                key={def.id}
                value={`add ${def.name} ${def.category}`}
                onSelect={() => handleAddNode(def)}
                className="flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer text-foreground data-[selected=true]:bg-accent"
              >
                <Plus className="w-4 h-4" style={{ color: def.color }} />
                {def.name}
                <span className="ml-auto text-[10px] text-muted-foreground">{def.category}</span>
              </Command.Item>
            ))}
          </Command.Group>
        </Command.List>
      </Command>
    </div>
  )
}
