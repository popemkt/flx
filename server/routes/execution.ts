import { Router } from 'express'
import { runScript } from '../services/script-executor.js'
import { executeWorkflow, type ExecNode, type ExecEdge, type ExecutionEvent } from '../services/execution-engine.js'
import { publishToExecutionSubscribers } from '../ws.js'
import { db, schema } from '../db.js'
import { eq, desc } from 'drizzle-orm'

const router = Router()
const activeExecutions = new Map<string, AbortController>()

// Keep legacy endpoint for backwards compatibility
router.post('/execution/run-script', async (req, res) => {
  const { command, cwd, shell } = req.body as {
    command: string
    cwd?: string
    shell?: 'powershell' | 'bash'
  }

  if (!command) {
    res.status(400).json({ error: 'command is required' })
    return
  }

  try {
    const result = await runScript({ command, cwd, shell })
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: msg })
  }
})

/** Start a server-side workflow execution */
router.post('/execution/run', async (req, res) => {
  const { nodes, edges, workflowId, executionId } = req.body as {
    nodes: ExecNode[]
    edges: ExecEdge[]
    workflowId?: string
    executionId?: string
  }

  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    res.status(400).json({ error: 'nodes array is required' })
    return
  }
  if (!executionId) {
    res.status(400).json({ error: 'executionId is required' })
    return
  }
  if (activeExecutions.has(executionId)) {
    res.status(409).json({ error: 'execution is already running' })
    return
  }

  const controller = new AbortController()
  activeExecutions.set(executionId, controller)

  // Stream progress events over WebSocket
  const onProgress = (event: ExecutionEvent) => {
    switch (event.type) {
      case 'node-start':
        publishToExecutionSubscribers(event.executionId, {
          type: 'execution:node-start',
          executionId: event.executionId,
          nodeId: event.nodeId,
        })
        break
      case 'node-complete':
        publishToExecutionSubscribers(event.executionId, {
          type: 'execution:node-complete',
          executionId: event.executionId,
          nodeId: event.nodeId,
          result: event.outputs,
        })
        break
      case 'node-error':
        publishToExecutionSubscribers(event.executionId, {
          type: 'execution:node-error',
          executionId: event.executionId,
          nodeId: event.nodeId,
          error: event.error,
        })
        break
      case 'session-created':
        publishToExecutionSubscribers(event.executionId, {
          type: 'execution:session-created',
          executionId: event.executionId,
          nodeId: event.nodeId,
          sessionId: event.sessionId,
          title: event.title,
        })
        break
      case 'complete':
        publishToExecutionSubscribers(event.executionId, {
          type: 'execution:complete',
          executionId: event.executionId,
          status: event.status,
        })
        break
    }
  }

  try {
    const result = await executeWorkflow(nodes, edges ?? [], {
      executionId,
      workflowId,
      onProgress,
      signal: controller.signal,
    })
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: msg })
  } finally {
    activeExecutions.delete(executionId)
  }
})

router.post('/execution/:id/cancel', (req, res) => {
  const controller = activeExecutions.get(req.params.id)
  if (!controller) {
    res.status(404).json({ error: 'Execution not found or already finished' })
    return
  }

  controller.abort()
  res.status(202).json({ ok: true })
})

/** Get execution details by ID */
router.get('/execution/:id', async (req, res) => {
  const rows = await db.select()
    .from(schema.executionHistory)
    .where(eq(schema.executionHistory.id, req.params.id))
    .limit(1)

  if (rows.length === 0) {
    res.status(404).json({ error: 'Execution not found' })
    return
  }

  res.json(rows[0])
})

/** List execution history */
router.get('/execution', async (req, res) => {
  const limit = Math.min(parseInt(String(req.query.limit)) || 50, 200)
  const offset = parseInt(String(req.query.offset)) || 0

  const rows = await db.select()
    .from(schema.executionHistory)
    .orderBy(desc(schema.executionHistory.startedAt))
    .limit(limit)
    .offset(offset)

  res.json(rows)
})

export default router
