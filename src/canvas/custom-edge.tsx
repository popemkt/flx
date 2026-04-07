import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react'
import { PORT_COLORS, type PortDataType } from '@/types/port'

export function CustomEdge(props: EdgeProps) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, sourceHandleId } = props
  const [edgePath] = getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition })

  const portType = sourceHandleId?.split('::')[1] as PortDataType | undefined
  const color = portType ? PORT_COLORS[portType] : '#6b7280'

  return (
    <BaseEdge
      path={edgePath}
      style={{ stroke: color, strokeWidth: 2, opacity: 0.7 }}
    />
  )
}
