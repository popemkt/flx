import { Position } from '@xyflow/react'
import { cn } from '@/lib/cn'
import { PortHandle } from './port-handle'
import { NodeStatus } from './node-status'
import { useNodeExecutionState } from '@/stores/execution.store'
import type { FlxNodeDefinition } from '@/types/node'

interface BaseNodeShellProps {
  id: string
  definition: FlxNodeDefinition
  label: string
  selected?: boolean
  children: React.ReactNode
}

export function BaseNodeShell({ id, definition, label, selected, children }: BaseNodeShellProps) {
  const { status } = useNodeExecutionState(id)

  return (
    <div
      className={cn(
        'rounded-lg border bg-card shadow-md min-w-[180px] max-w-[280px]',
        selected && 'ring-2 ring-ring',
        status === 'running' && 'ring-2 ring-blue-500',
        status === 'success' && 'ring-2 ring-green-500',
        status === 'error' && 'ring-2 ring-red-500',
      )}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-b"
        style={{ borderLeftColor: definition.color ?? '#6b7280', borderLeftWidth: 3 }}
      >
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
