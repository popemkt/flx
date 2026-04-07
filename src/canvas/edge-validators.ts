import { canConnect, type PortDataType } from '@/types/port'
import type { IsValidConnection } from '@xyflow/react'

export const isValidConnection: IsValidConnection = (connection) => {
  const sourceType = connection.sourceHandle?.split('::')[1] as PortDataType | undefined
  const targetType = connection.targetHandle?.split('::')[1] as PortDataType | undefined
  if (!sourceType || !targetType) return false
  return canConnect(sourceType, targetType)
}
