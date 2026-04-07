import { Router } from 'express'
import { runScript } from '../services/script-executor.js'
import { executeWorkflow, type ExecNode, type ExecEdge, type ExecutionEvent } from '../services/execution-engine.js'
import { broadcast, subscribeAllToSession } from '../ws.js'
import { db, schema } from '../db.js'
import { eq, desc } from 'drizzle-orm'

const router = Router()

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
  const { nodes, edges, workflowId } = req.body as {
    nodes: ExecNode[]
    edges: ExecEdge[]
    workflowId?: string
  }

  if (!nodes || !Array.isArray(nodes) || nodes.length === 0) {
    res.status(400).json({ error: 'nodes array is required' })
    return
  }

  // Stream progress events over WebSocket
  const onProgress = (event: ExecutionEvent) => {
    switch (event.type) {
      case 'node-start':
        broadcast({
          type: 'execution:node-start',
          executionId: event.executionId,
          nodeId: event.nodeId,
        })
        break
      case 'node-complete':
        broadcast({
          type: 'execution:node-complete',
          executionId: event.executionId,
          nodeId: event.nodeId,
          result: event.outputs,
        })
        break
      case 'node-error':
        broadcast({
          type: 'execution:node-error',
          executionId: event.executionId,
          nodeId: event.nodeId,
          error: event.error,
        })
        break
      case 'session-created':
        // Auto-subscribe all connected clients so they receive stream data
        subscribeAllToSession(event.sessionId)
        broadcast({
          type: 'execution:session-created',
          executionId: event.executionId,
          nodeId: event.nodeId,
          sessionId: event.sessionId,
          title: event.title,
        })
        break
      case 'complete':
        broadcast({
          type: 'execution:complete',
          executionId: event.executionId,
          status: event.status,
        })
        break
    }
  }

  try {
    const result = await executeWorkflow(nodes, edges ?? [], {
      workflowId,
      onProgress,
    })
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: msg })
  }
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
