import { canConnect, type PortDataType } from '@/types/port'
import { useWorkflowStore } from '@/stores/workflow.store'
import type { IsValidConnection } from '@xyflow/react'

export const isValidConnection: IsValidConnection = (connection) => {
  const { source, target, sourceHandle, targetHandle } = connection

  // 1. No self-connections
  if (source === target) return false

  // 2. Check port type compatibility
  const sourceType = sourceHandle?.split('::')[1] as PortDataType | undefined
  const targetType = targetHandle?.split('::')[1] as PortDataType | undefined
  if (!sourceType || !targetType) return false
  if (!canConnect(sourceType, targetType)) return false

  // 3. No duplicate edges (same source port → same target port)
  const edges = useWorkflowStore.getState().edges
  const duplicate = edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      e.sourceHandle === sourceHandle &&
      e.targetHandle === targetHandle,
  )
  if (duplicate) return false

  // 4. Each input port accepts only one connection
  const targetPortOccupied = edges.some(
    (e) => e.target === target && e.targetHandle === targetHandle,
  )
  if (targetPortOccupied) return false

  return true
}
