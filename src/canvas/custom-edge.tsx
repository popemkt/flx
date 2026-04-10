import { BaseEdge, EdgeLabelRenderer, getBezierPath, useReactFlow, type EdgeProps } from '@xyflow/react'
import { PORT_COLORS, type PortDataType } from '@/types/port'
import { useWorkflowStore } from '@/stores/workflow.store'
import { X } from 'lucide-react'

export function CustomEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, sourceHandleId, target, targetHandleId, selected } = props
  const { deleteElements } = useReactFlow()
  const [edgePath, labelX, labelY] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })

  const portType = sourceHandleId?.split('::')[1] as PortDataType | undefined
  const color = portType ? PORT_COLORS[portType] : '#6b7280'

  // Check if this edge is part of a multi-input group and compute its order
  const siblingEdges = useWorkflowStore((s) =>
    s.edges.filter((e) => e.target === target && e.targetHandle === targetHandleId),
  )
  const isMulti = siblingEdges.length > 1
  const orderIndex = isMulti ? siblingEdges.findIndex((e) => e.id === id) + 1 : 0

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: selected ? '#ef4444' : color,
          strokeWidth: selected ? 3 : 2,
          opacity: selected ? 1 : 0.7,
        }}
        interactionWidth={20}
      />
      <EdgeLabelRenderer>
        {isMulti && (
          <div
            className="absolute flex items-center justify-center w-4 h-4 rounded-full bg-card border border-border text-[9px] font-bold text-foreground shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${targetX - 16}px,${targetY}px)`,
              pointerEvents: 'none',
            }}
          >
            {orderIndex}
          </div>
        )}
        {selected && (
          <button
            className="nodrag nopan absolute flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white hover:bg-red-600 shadow-md border border-red-400"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            onClick={() => deleteElements({ edges: [{ id }] })}
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </EdgeLabelRenderer>
    </>
  )
}
