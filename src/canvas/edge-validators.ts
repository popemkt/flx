import { canConnect, type PortDataType } from '@/types/port'
import { useWorkflowStore } from '@/stores/workflow.store'
import type { FlxNodeData } from '@/types/node'
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

  const { edges, nodes } = useWorkflowStore.getState()

  // 3. No duplicate edges (same source port → same target port)
  const duplicate = edges.some(
    (e) =>
      e.source === source &&
      e.target === target &&
      e.sourceHandle === sourceHandle &&
      e.targetHandle === targetHandle,
  )
  if (duplicate) return false

  // 4. Check if target port allows multiple connections
  const targetPortId = targetHandle?.split('::')[0]
  const targetNode = nodes.find((n) => n.id === target)
  const targetPortDef = targetNode
    ? (targetNode.data as FlxNodeData).definition.ports.inputs.find((p) => p.id === targetPortId)
    : null

  if (!targetPortDef?.multi) {
    // Single-connection port — reject if already occupied
    const targetPortOccupied = edges.some(
      (e) => e.target === target && e.targetHandle === targetHandle,
    )
    if (targetPortOccupied) return false
  }

  return true
}
