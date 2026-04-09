import { useCallback, useEffect, useMemo } from 'react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useExecutionStore } from '@/stores/execution.store'
import { useTerminalStore } from '@/stores/terminal.store'
import { ensureConnected, addMessageHandler, sendMessage } from '@/lib/ws-client'
import type { Node, Edge } from '@xyflow/react'
import type { FlxNodeData } from '@/types/node'
import { nanoid } from 'nanoid'

/** Walk backward from target nodes to find all upstream dependencies */
function collectUpstreamSubgraph(
  targetIds: Set<string>,
  allNodes: Node<FlxNodeData>[],
  allEdges: Edge[],
): { nodes: Node<FlxNodeData>[]; edges: Edge[] } {
  const included = new Set(targetIds)
  const queue = [...targetIds]

  while (queue.length > 0) {
    const nodeId = queue.shift()!
    for (const edge of allEdges) {
      if (edge.target === nodeId && !included.has(edge.source)) {
        included.add(edge.source)
        queue.push(edge.source)
      }
    }
  }

  const subNodes = allNodes.filter((n) => included.has(n.id))
  const subEdges = allEdges.filter((e) => included.has(e.source) && included.has(e.target))
  return { nodes: subNodes, edges: subEdges }
}

function buildExecPayload(nodes: Node<FlxNodeData>[], edges: Edge[]) {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      typeId: n.data.definition.id,
      label: n.data.label,
      config: n.data.config,
      ports: n.data.definition.ports,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? '',
      target: e.target,
      targetHandle: e.targetHandle ?? '',
    })),
  }
}

async function executePayload(
  payload: ReturnType<typeof buildExecPayload>,
  nodeIds: string[],
  executionId: string,
  startExecution: (id: string, nodeIds: string[]) => void,
  completeExecution: (status: 'success' | 'error' | 'cancelled') => void,
) {
  ensureConnected()
  sendMessage({ type: 'execution:subscribe', executionId })
  startExecution(executionId, nodeIds)

  try {
    const res = await fetch('/api/v1/execution/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, executionId }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Execution failed' }))
      console.error('Execution failed:', err.error)
      sendMessage({ type: 'execution:unsubscribe', executionId })
      completeExecution('error')
      return
    }

    const result = await res.json() as { status: 'success' | 'error' | 'cancelled' }
    sendMessage({ type: 'execution:unsubscribe', executionId })
    completeExecution(result.status)
  } catch (err) {
    console.error('Execution failed:', err)
    sendMessage({ type: 'execution:unsubscribe', executionId })
    completeExecution('error')
  }
}

export function useRunWorkflow() {
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const startExecution = useExecutionStore((s) => s.startExecution)
  const setNodeRunning = useExecutionStore((s) => s.setNodeRunning)
  const setNodeComplete = useExecutionStore((s) => s.setNodeComplete)
  const setNodeError = useExecutionStore((s) => s.setNodeError)
  const completeExecution = useExecutionStore((s) => s.completeExecution)
  const activeExecutionId = useExecutionStore((s) => s.activeExecutionId)
  const status = useExecutionStore((s) => s.status)
  const addTab = useTerminalStore((s) => s.addTab)
  const updateTabStatus = useTerminalStore((s) => s.updateTabStatus)

  // Listen to WS execution events
  useEffect(() => {
    ensureConnected()

    const removeHandler = addMessageHandler((msg) => {
      if (
        typeof msg.type === 'string' &&
        msg.type.startsWith('execution:') &&
        msg.executionId !== useExecutionStore.getState().activeExecutionId
      ) {
        return
      }

      switch (msg.type) {
        case 'execution:node-start':
          setNodeRunning(msg.nodeId as string)
          break
        case 'execution:node-complete':
          setNodeComplete(msg.nodeId as string, msg.result as Record<string, unknown>)
          break
        case 'execution:node-error':
          setNodeError(msg.nodeId as string, msg.error as string)
          break
        case 'execution:complete':
          sendMessage({ type: 'execution:unsubscribe', executionId: msg.executionId as string })
          completeExecution(msg.status as 'success' | 'error' | 'cancelled')
          break
        case 'execution:session-created':
          addTab({
            sessionId: msg.sessionId as string,
            title: msg.title as string,
            status: 'running',
          })
          break
        case 'pty:exit':
          updateTabStatus(msg.sessionId as string, 'exited', msg.exitCode as number)
          break
      }
    })

    return removeHandler
  }, [setNodeRunning, setNodeComplete, setNodeError, completeExecution, updateTabStatus, addTab])

  // Run all nodes
  const run = useCallback(async () => {
    if (status === 'running') return
    if (nodes.length === 0) return
    const executionId = nanoid()
    const payload = buildExecPayload(nodes, edges)
    await executePayload(payload, nodes.map((n) => n.id), executionId, startExecution, completeExecution)
  }, [nodes, edges, status, startExecution, completeExecution])

  // Run only selected nodes + their upstream deps
  const runSelection = useCallback(async () => {
    if (status === 'running') return
    const selectedIds = new Set(nodes.filter((n) => n.selected).map((n) => n.id))
    if (selectedIds.size === 0) return
    const executionId = nanoid()
    const sub = collectUpstreamSubgraph(selectedIds, nodes, edges)
    const payload = buildExecPayload(sub.nodes, sub.edges)
    await executePayload(payload, sub.nodes.map((n) => n.id), executionId, startExecution, completeExecution)
  }, [nodes, edges, status, startExecution, completeExecution])

  // Run a single node + its upstream deps
  const runNode = useCallback(async (nodeId: string) => {
    if (status === 'running') return
    const executionId = nanoid()
    const sub = collectUpstreamSubgraph(new Set([nodeId]), nodes, edges)
    const payload = buildExecPayload(sub.nodes, sub.edges)
    await executePayload(payload, sub.nodes.map((n) => n.id), executionId, startExecution, completeExecution)
  }, [nodes, edges, status, startExecution, completeExecution])

  const cancel = useCallback(async () => {
    if (status !== 'running' || !activeExecutionId) return
    try {
      const res = await fetch(`/api/v1/execution/${activeExecutionId}/cancel`, {
        method: 'POST',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed to cancel execution' }))
        console.error('Cancel failed:', err.error)
      }
    } catch (err) {
      console.error('Cancel failed:', err)
    }
  }, [status, activeExecutionId])

  // Compute selected node count for UI
  const selectedCount = useMemo(
    () => nodes.filter((n) => n.selected).length,
    [nodes],
  )

  return { run, runSelection, runNode, cancel, status, selectedCount }
}
