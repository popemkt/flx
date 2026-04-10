import type { NodeProps } from '@xyflow/react'
import type { PortsDefinition, PortValue } from './port'

export type FlxNodeFamily =
  | 'source'
  | 'data'
  | 'effect'
  | 'control'
  | 'human'
  | 'debug'
  | 'layout'

export interface FlxNodeDefinition {
  id: string
  name: string
  category: 'input' | 'transform' | 'output' | 'control' | 'agent' | 'custom'
  family: FlxNodeFamily
  description?: string
  icon?: string
  color?: string
  ports: PortsDefinition
  defaultConfig?: Record<string, unknown>
  executable?: boolean
  paletteHidden?: boolean
  aliases?: string[]
}

export interface FlxNodeData extends Record<string, unknown> {
  definition: FlxNodeDefinition
  config: Record<string, unknown>
  executionStatus?: 'idle' | 'running' | 'success' | 'error'
  lastOutputs?: Record<string, PortValue>
  lastError?: string
  label: string
  workflowId: string
}

export type FlxNodeProps = NodeProps & {
  data: FlxNodeData
}

export interface ExecutionContext {
  serverApi: {
    runScript(params: {
      command: string
      cwd?: string
      shell?: 'powershell' | 'bash'
    }): Promise<{ exitCode: number; stdout: string; stderr: string }>
    createPtySession(params: {
      cwd?: string
      shellCommand?: string
    }): Promise<{ sessionId: string }>
  }
  ws: WebSocket
  executionId: string
  signal: AbortSignal
}

export interface FlxNodeRunner {
  execute(
    inputs: Record<string, PortValue>,
    config: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<Record<string, PortValue>>
}

export interface NodeTypeEntry {
  definition: FlxNodeDefinition
  component: React.ComponentType<FlxNodeProps>
  runner: FlxNodeRunner
}
