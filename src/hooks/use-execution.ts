import { useCallback, useEffect } from 'react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useExecutionStore } from '@/stores/execution.store'
import { useTerminalStore } from '@/stores/terminal.store'
import { ensureConnected, addMessageHandler } from '@/lib/ws-client'

export function useRunWorkflow() {
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const startExecution = useExecutionStore((s) => s.startExecution)
  const setNodeRunning = useExecutionStore((s) => s.setNodeRunning)
  const setNodeComplete = useExecutionStore((s) => s.setNodeComplete)
  const setNodeError = useExecutionStore((s) => s.setNodeError)
  const completeExecution = useExecutionStore((s) => s.completeExecution)
  const status = useExecutionStore((s) => s.status)
  const addTab = useTerminalStore((s) => s.addTab)
  const updateTabStatus = useTerminalStore((s) => s.updateTabStatus)

  // Listen to WS execution events
  useEffect(() => {
    ensureConnected()

    const removeHandler = addMessageHandler((msg) => {
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
          completeExecution(msg.status as 'success' | 'error')
          break
        case 'execution:session-created':
          // Server created a streaming session for a script node — add terminal tab
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
  }, [setNodeRunning, setNodeComplete, setNodeError, completeExecution, updateTabStatus])

  const run = useCallback(async () => {
    if (status === 'running') return
    if (nodes.length === 0) return

    ensureConnected()

    // Build the execution payload from current canvas state
    const execNodes = nodes.map((n) => ({
      id: n.id,
      typeId: n.data.definition.id,
      label: n.data.label,
      config: n.data.config,
      ports: n.data.definition.ports,
    }))

    const execEdges = edges.map((e) => ({
      id: e.id,
      source: e.source,
      sourceHandle: e.sourceHandle ?? '',
      target: e.target,
      targetHandle: e.targetHandle ?? '',
    }))

    // Optimistic UI: mark all nodes as pending
    startExecution('pending', nodes.map((n) => n.id))

    try {
      const res = await fetch('/api/v1/execution/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes: execNodes, edges: execEdges }),
      })

      if (!res.ok) {
        const err = await res.json()
        console.error('Execution failed:', err.error)
        // completeExecution is already called via WS event
      }
      // Result comes back after execution completes, but UI is already
      // updated via WS events (node-start, node-complete, session-created, etc.)
    } catch (err) {
      console.error('Execution failed:', err)
      completeExecution('error')
    }
  }, [nodes, edges, status, startExecution, completeExecution, addTab])

  return { run, status }
}
