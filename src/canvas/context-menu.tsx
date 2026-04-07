import { useState, useCallback, useEffect, useRef } from 'react'
import { getAllDefinitions } from './node-types-registry'
import { useWorkflowStore } from '@/stores/workflow.store'
import { nanoid } from 'nanoid'
import type { FlxNodeDefinition } from '@/types/node'

interface ContextMenuState {
  x: number
  y: number
  canvasX: number
  canvasY: number
}

export function useCanvasContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null)

  const onContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault()
    // Get the ReactFlow instance's viewport-relative position
    const reactFlowBounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({
      x: event.clientX,
      y: event.clientY,
      canvasX: event.clientX - reactFlowBounds.left,
      canvasY: event.clientY - reactFlowBounds.top,
    })
  }, [])

  const close = useCallback(() => setMenu(null), [])

  return { menu, onContextMenu, close }
}

interface CanvasContextMenuProps {
  x: number
  y: number
  canvasX: number
  canvasY: number
  onClose: () => void
  screenToFlowPosition: (pos: { x: number; y: number }) => { x: number; y: number }
}

export function CanvasContextMenu({ x, y, onClose, screenToFlowPosition, canvasX, canvasY }: CanvasContextMenuProps) {
  const addNode = useWorkflowStore((s) => s.addNode)
  const definitions = getAllDefinitions()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleAdd = (def: FlxNodeDefinition) => {
    const position = screenToFlowPosition({ x: canvasX, y: canvasY })
    addNode({
      id: nanoid(),
      type: def.id,
      position,
      data: {
        definition: def,
        config: def.defaultConfig ? { ...def.defaultConfig } : {},
        label: def.name,
        workflowId: 'default',
      },
    })
    onClose()
  }

  return (
    <div
      ref={ref}
      className="fixed z-50 min-w-[160px] rounded-md border bg-popover shadow-lg p-1"
      style={{ left: x, top: y }}
    >
      <div className="px-2 py-1 text-[10px] text-muted-foreground uppercase tracking-wider">Add Node</div>
      {definitions.map((def) => (
        <button
          key={def.id}
          onClick={() => handleAdd(def)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-accent text-foreground text-left"
        >
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: def.color }} />
          {def.name}
        </button>
      ))}
    </div>
  )
}
