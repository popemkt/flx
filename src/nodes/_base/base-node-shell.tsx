import { Position } from '@xyflow/react'
import { cn } from '@/lib/cn'
import { PortHandle } from './port-handle'
import { NodeStatus } from './node-status'
import { useNodeExecutionState } from '@/stores/execution.store'
import { useCanvasStore } from '@/stores/canvas.store'
import { Type, Hash, List, Terminal, Eye, Cpu, type LucideIcon } from 'lucide-react'
import type { FlxNodeDefinition } from '@/types/node'

const ICON_MAP: Record<string, LucideIcon> = {
  Type, Hash, List, Terminal, Eye, Cpu,
}

function NodeIcon({ name, color }: { name?: string; color?: string }) {
  const Icon = name ? ICON_MAP[name] : null
  if (!Icon) return null
  return <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: color ?? '#6b7280' }} />
}

interface BaseNodeShellProps {
  id: string
  definition: FlxNodeDefinition
  label: string
  selected?: boolean
  children: React.ReactNode
}

export function BaseNodeShell({ id, definition, label, selected, children }: BaseNodeShellProps) {
  const { status } = useNodeExecutionState(id)
  const viewMode = useCanvasStore((s) => s.viewMode)
  const setSelectedNodeForConfig = useCanvasStore((s) => s.setSelectedNodeForConfig)
  const selectedNodeForConfig = useCanvasStore((s) => s.selectedNodeForConfig)

  const isCompact = viewMode === 'compact'
  const isConfigTarget = selectedNodeForConfig === id

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedNodeForConfig(id)
  }

  if (isCompact) {
    return (
      <div
        className={cn(
          'rounded-lg border bg-card shadow-md cursor-pointer transition-all',
          selected && 'ring-2 ring-ring',
          isConfigTarget && 'ring-2 ring-primary',
          status === 'running' && 'ring-2 ring-blue-500',
          status === 'success' && 'ring-2 ring-green-500',
          status === 'error' && 'ring-2 ring-red-500',
        )}
        onDoubleClick={handleDoubleClick}
      >
        {/* Compact header */}
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ borderLeftColor: definition.color ?? '#6b7280', borderLeftWidth: 3 }}
        >
          <NodeIcon name={definition.icon} color={definition.color} />
          <span className="text-xs font-medium truncate flex-1">{label}</span>
          <NodeStatus nodeId={id} />
        </div>

        {/* Hidden port handles (still needed for edges) */}
        {definition.ports.inputs.map((port) => (
          <PortHandle
            key={port.id}
            type="target"
            portId={port.id}
            dataType={port.dataType}
            label=""
            position={Position.Left}
          />
        ))}
        {definition.ports.outputs.map((port) => (
          <PortHandle
            key={port.id}
            type="source"
            portId={port.id}
            dataType={port.dataType}
            label=""
            position={Position.Right}
          />
        ))}
      </div>
    )
  }

  // Expanded mode (original)
  return (
    <div
      className={cn(
        'rounded-lg border bg-card shadow-md min-w-[180px] max-w-[280px]',
        selected && 'ring-2 ring-ring',
        isConfigTarget && 'ring-2 ring-primary',
        status === 'running' && 'ring-2 ring-blue-500',
        status === 'success' && 'ring-2 ring-green-500',
        status === 'error' && 'ring-2 ring-red-500',
      )}
      onDoubleClick={handleDoubleClick}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-b"
        style={{ borderLeftColor: definition.color ?? '#6b7280', borderLeftWidth: 3 }}
      >
        <NodeIcon name={definition.icon} color={definition.color} />
        <span className="text-xs font-medium truncate flex-1">{label}</span>
        <NodeStatus nodeId={id} />
      </div>

      {/* Input ports */}
      {definition.ports.inputs.length > 0 && (
        <div className="flex flex-col gap-0.5 py-1">
          {definition.ports.inputs.map((port) => (
            <PortHandle
              key={port.id}
              type="target"
              portId={port.id}
              dataType={port.dataType}
              label={port.label}
              position={Position.Left}
            />
          ))}
        </div>
      )}

      {/* Body */}
      <div className="px-3 py-2">{children}</div>

      {/* Output ports */}
      {definition.ports.outputs.length > 0 && (
        <div className="flex flex-col gap-0.5 py-1">
          {definition.ports.outputs.map((port) => (
            <PortHandle
              key={port.id}
              type="source"
              portId={port.id}
              dataType={port.dataType}
              label={port.label}
              position={Position.Right}
            />
          ))}
        </div>
      )}
    </div>
  )
}
