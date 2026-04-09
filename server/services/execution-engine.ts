import { nanoid } from 'nanoid'
import { coerceValue, type PortDataType, type PortValue, type PortDefinition } from '../../src/types/port.js'
import { sessionManager } from './session-manager.js'
import { db, schema } from '../db.js'
import { eq } from 'drizzle-orm'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ExecNode {
  id: string
  typeId: string
  label: string
  config: Record<string, unknown>
  ports: {
    inputs: PortDefinition[]
    outputs: PortDefinition[]
  }
}

export interface ExecEdge {
  id: string
  source: string
  sourceHandle: string  // "portId::dataType"
  target: string
  targetHandle: string  // "portId::dataType"
}

interface NodeLog {
  nodeId: string
  typeId: string
  label: string
  status: 'success' | 'error'
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  error?: string
  sessionId?: string
  startedAt: number
  completedAt: number
  durationMs: number
}

export interface ExecutionResult {
  executionId: string
  status: 'success' | 'error'
  nodeLogs: Record<string, NodeLog>
  startedAt: number
  completedAt: number
  durationMs: number
  error?: string
}

type ProgressCallback = (event: ExecutionEvent) => void

export type ExecutionEvent =
  | { type: 'node-start'; executionId: string; nodeId: string }
  | { type: 'node-complete'; executionId: string; nodeId: string; outputs: Record<string, unknown> }
  | { type: 'node-error'; executionId: string; nodeId: string; error: string }
  | { type: 'session-created'; executionId: string; nodeId: string; sessionId: string; title: string }
  | { type: 'complete'; executionId: string; status: 'success' | 'error' }

// ─── Topo sort (server-side copy, no React deps) ───────────────────────────

function topoSort(nodeIds: string[], edges: Array<{ from: string; to: string }>): string[] {
  const inDegree = new Map<string, number>()
  const adjacency = new Map<string, string[]>()

  for (const id of nodeIds) {
    inDegree.set(id, 0)
    adjacency.set(id, [])
  }

  for (const { from, to } of edges) {
    adjacency.get(from)?.push(to)
    inDegree.set(to, (inDegree.get(to) ?? 0) + 1)
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const sorted: string[] = []
  while (queue.length > 0) {
    const current = queue.shift()!
    sorted.push(current)
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1
      inDegree.set(neighbor, newDegree)
      if (newDegree === 0) queue.push(neighbor)
    }
  }

  if (sorted.length !== nodeIds.length) {
    throw new Error('Workflow contains a cycle')
  }

  return sorted
}

// ─── Node runners (server-side) ─────────────────────────────────────────────

async function runNode(
  typeId: string,
  inputs: Record<string, PortValue>,
  config: Record<string, unknown>,
  onSessionCreated?: (sessionId: string, title: string) => void,
): Promise<{ outputs: Record<string, PortValue>; sessionId?: string }> {
  switch (typeId) {
    case 'text-input':
      return { outputs: { value: String(config.value ?? '') } }

    case 'number-input':
      return { outputs: { value: parseFloat(String(config.value ?? '0')) || 0 } }

    case 'enum-selector': {
      // Dynamic options from piped input take priority over static config
      let options: string[]
      if (inputs.options) {
        const raw = String(inputs.options).trim()
        options = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
      } else {
        options = String(config.options ?? '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
      }
      const selected = String(config.selected ?? '')
      const value = selected && options.includes(selected) ? selected : (options[0] ?? '')
      return { outputs: { value } }
    }

    case 'output-display':
      return { outputs: { value: inputs.value ?? '' } }

    case 'script': {
      let command = String(config.command ?? '')
      for (const [key, value] of Object.entries(inputs)) {
        command = command.replaceAll(`{{${key}}}`, String(value).trim())
      }

      const shell = (config.shell as 'powershell' | 'bash') ?? 'powershell'
      const cwd = config.cwd ? String(config.cwd) : undefined
      const title = command.length > 40 ? command.slice(0, 37) + '...' : command

      // Create streaming session (output will be sent to WS subscribers)
      const sessionId = sessionManager.createScriptSession({ command, shell, cwd, title })
      onSessionCreated?.(sessionId, title)
      const result = await sessionManager.waitForExit(sessionId)

      return {
        outputs: {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
        },
        sessionId,
      }
    }

    default:
      throw new Error(`Unknown node type: ${typeId}`)
  }
}

// ─── Execution engine ──────────────────────────────────────────────────────

export async function executeWorkflow(
  nodes: ExecNode[],
  edges: ExecEdge[],
  options?: {
    workflowId?: string
    onProgress?: ProgressCallback
    signal?: AbortSignal
  },
): Promise<ExecutionResult> {
  const executionId = nanoid()
  const startedAt = Date.now()
  const nodeLogs: Record<string, NodeLog> = {}
  const onProgress = options?.onProgress

  // Insert execution record
  const workflowId = options?.workflowId ?? null
  await db.insert(schema.executionHistory).values({
    id: executionId,
    workflowId,
    status: 'running',
    startedAt: new Date(startedAt),
    triggerType: 'manual',
    nodeResults: {},
  })

  // Topo sort
  const sortedIds = topoSort(
    nodes.map((n) => n.id),
    edges.map((e) => ({ from: e.source, to: e.target })),
  )

  const dataBus = new Map<string, Record<string, PortValue>>()
  let finalStatus: 'success' | 'error' = 'success'
  let finalError: string | undefined

  for (const nodeId of sortedIds) {
    if (options?.signal?.aborted) {
      finalStatus = 'error'
      finalError = 'Execution cancelled'
      break
    }

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) continue

    const nodeStartedAt = Date.now()
    onProgress?.({ type: 'node-start', executionId, nodeId })

    // Gather inputs from data bus with coercion
    const inputs: Record<string, PortValue> = {}
    let inputError: string | undefined

    for (const inputPort of node.ports.inputs) {
      const edge = edges.find(
        (e) => e.target === nodeId && e.targetHandle.startsWith(inputPort.id + '::'),
      )

      if (edge) {
        const sourceOutputs = dataBus.get(edge.source)
        const sourcePortId = edge.sourceHandle.split('::')[0]
        const sourcePortType = edge.sourceHandle.split('::')[1] as PortDataType

        if (sourceOutputs && sourcePortId && sourcePortId in sourceOutputs) {
          const rawValue = sourceOutputs[sourcePortId]
          inputs[inputPort.id] = coerceValue(rawValue, sourcePortType, inputPort.dataType)
        }
      } else if (inputPort.defaultValue !== undefined) {
        inputs[inputPort.id] = inputPort.defaultValue
      } else if (inputPort.required !== false) {
        inputError = `Required input "${inputPort.label}" is not connected`
      }
    }

    if (inputError) {
      const completedAt = Date.now()
      nodeLogs[nodeId] = {
        nodeId,
        typeId: node.typeId,
        label: node.label,
        status: 'error',
        inputs,
        outputs: {},
        error: inputError,
        startedAt: nodeStartedAt,
        completedAt,
        durationMs: completedAt - nodeStartedAt,
      }
      onProgress?.({ type: 'node-error', executionId, nodeId, error: inputError })
      finalStatus = 'error'
      finalError = inputError
      break
    }

    // Execute node
    try {
      const { outputs, sessionId } = await runNode(node.typeId, inputs, node.config, (sid, title) => {
        onProgress?.({ type: 'session-created', executionId, nodeId, sessionId: sid, title })
      })
      dataBus.set(nodeId, outputs)

      const completedAt = Date.now()
      nodeLogs[nodeId] = {
        nodeId,
        typeId: node.typeId,
        label: node.label,
        status: 'success',
        inputs: inputs as Record<string, unknown>,
        outputs: outputs as Record<string, unknown>,
        sessionId,
        startedAt: nodeStartedAt,
        completedAt,
        durationMs: completedAt - nodeStartedAt,
      }

      onProgress?.({ type: 'node-complete', executionId, nodeId, outputs: outputs as Record<string, unknown> })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const completedAt = Date.now()

      nodeLogs[nodeId] = {
        nodeId,
        typeId: node.typeId,
        label: node.label,
        status: 'error',
        inputs: inputs as Record<string, unknown>,
        outputs: {},
        error: msg,
        startedAt: nodeStartedAt,
        completedAt,
        durationMs: completedAt - nodeStartedAt,
      }

      onProgress?.({ type: 'node-error', executionId, nodeId, error: msg })
      finalStatus = 'error'
      finalError = msg
      break
    }
  }

  const completedAt = Date.now()
  onProgress?.({ type: 'complete', executionId, status: finalStatus })

  // Update execution record
  await db.update(schema.executionHistory)
    .set({
      status: finalStatus,
      completedAt: new Date(completedAt),
      durationMs: completedAt - startedAt,
      nodeResults: nodeLogs,
      error: finalError,
    })
    .where(eq(schema.executionHistory.id, executionId))

  return {
    executionId,
    status: finalStatus,
    nodeLogs,
    startedAt,
    completedAt,
    durationMs: completedAt - startedAt,
    error: finalError,
  }
}
