import { topoSort } from '@/lib/topo-sort'
import { coerceValue, type PortDataType, type PortValue } from '@/types/port'
import { getNodeRunner } from '@/canvas/node-types-registry'
import type { ExecutionContext, FlxNodeData } from '@/types/node'
import type { Node, Edge } from '@xyflow/react'

interface ExecutionCallbacks {
  onNodeStart: (nodeId: string) => void
  onNodeComplete: (nodeId: string, outputs: Record<string, PortValue>) => void
  onNodeError: (nodeId: string, error: string) => void
  onComplete: (status: 'success' | 'error') => void
}

export async function executeWorkflow(
  nodes: Node<FlxNodeData>[],
  edges: Edge[],
  context: ExecutionContext,
  callbacks: ExecutionCallbacks,
): Promise<void> {
  const sortedIds = topoSort(
    nodes.map((n) => n.id),
    edges.map((e) => ({ from: e.source, to: e.target })),
  )

  const dataBus = new Map<string, Record<string, PortValue>>()

  for (const nodeId of sortedIds) {
    if (context.signal.aborted) {
      callbacks.onComplete('error')
      return
    }

    const node = nodes.find((n) => n.id === nodeId)
    if (!node) continue

    const definition = node.data.definition
    const runner = getNodeRunner(definition.id)
    if (!runner) {
      callbacks.onNodeError(nodeId, `No runner for node type: ${definition.id}`)
      callbacks.onComplete('error')
      return
    }

    callbacks.onNodeStart(nodeId)

    const inputs: Record<string, PortValue> = {}

    for (const inputPort of definition.ports.inputs) {
      const edge = edges.find(
        (e) => e.target === nodeId && e.targetHandle?.startsWith(inputPort.id + '::'),
      )

      if (edge) {
        const sourceOutputs = dataBus.get(edge.source)
        const sourcePortId = edge.sourceHandle?.split('::')[0]
        const sourcePortType = edge.sourceHandle?.split('::')[1] as PortDataType

        if (sourceOutputs && sourcePortId && sourcePortId in sourceOutputs) {
          const rawValue = sourceOutputs[sourcePortId]
          inputs[inputPort.id] = coerceValue(rawValue, sourcePortType, inputPort.dataType)
        }
      } else if (inputPort.defaultValue !== undefined) {
        inputs[inputPort.id] = inputPort.defaultValue
      } else if (inputPort.required !== false) {
        callbacks.onNodeError(nodeId, `Required input "${inputPort.label}" is not connected`)
        callbacks.onComplete('error')
        return
      }
    }

    try {
      const outputs = await runner.execute(inputs, node.data.config, context)
      dataBus.set(nodeId, outputs)
      callbacks.onNodeComplete(nodeId, outputs)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      callbacks.onNodeError(nodeId, msg)
      callbacks.onComplete('error')
      return
    }
  }

  callbacks.onComplete('success')
}
