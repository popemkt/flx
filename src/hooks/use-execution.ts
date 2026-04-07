import { useCallback } from 'react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useExecutionStore } from '@/stores/execution.store'
import { useTerminalStore } from '@/stores/terminal.store'
import { executeWorkflow } from '@/execution/engine'
import type { ExecutionContext } from '@/types/node'
import { nanoid } from 'nanoid'
import { ensureConnected, sendMessage } from '@/lib/ws-client'

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 3) + '...' : s
}

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

  const run = useCallback(async () => {
    if (status === 'running') return
    if (nodes.length === 0) return

    const executionId = nanoid()
    const abortController = new AbortController()

    startExecution(executionId, nodes.map((n) => n.id))

    // Ensure WebSocket is connected for streaming
    ensureConnected()

    const context: ExecutionContext = {
      executionId,
      signal: abortController.signal,
      ws: null as unknown as WebSocket,
      serverApi: {
        async runScript(params) {
          const title = truncate(params.command, 40)

          // 1. Create streaming session (returns immediately with sessionId)
          const createRes = await fetch('/api/v1/pty/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              command: params.command,
              shell: params.shell,
              cwd: params.cwd,
              title,
            }),
          })

          if (!createRes.ok) {
            const err = await createRes.json()
            throw new Error(err.error || 'Failed to create session')
          }

          const { sessionId } = await createRes.json()

          // 2. Subscribe to WS stream and add terminal tab
          sendMessage({ type: 'pty:subscribe', sessionId })
          addTab({ sessionId, title, status: 'running' })

          // 3. Wait for result (blocks until process exits, while WS streams output)
          const resultRes = await fetch(`/api/v1/pty/sessions/${sessionId}/result`)
          const result = await resultRes.json()

          // 4. Update tab status
          updateTabStatus(sessionId, 'exited', result.exitCode)

          return {
            exitCode: result.exitCode,
            stdout: result.stdout,
            stderr: result.stderr,
          }
        },
        async createPtySession(params) {
          const res = await fetch('/api/v1/pty/sessions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
          })
          return res.json()
        },
      },
    }

    await executeWorkflow(nodes, edges, context, {
      onNodeStart: setNodeRunning,
      onNodeComplete: (nodeId, outputs) => {
        setNodeComplete(nodeId, outputs as Record<string, unknown>)
      },
      onNodeError: setNodeError,
      onComplete: completeExecution,
    })
  }, [nodes, edges, status, startExecution, setNodeRunning, setNodeComplete, setNodeError, completeExecution, addTab, updateTabStatus])

  return { run, status }
}
