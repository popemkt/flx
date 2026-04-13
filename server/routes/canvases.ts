import { Router } from 'express'
import { db, schema } from '../db.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

const router = Router()

router.get('/', async (_req, res) => {
  const all = await db.select().from(schema.canvases)
  res.json(all)
})

/** Get or create default canvas (must be before /:id) */
router.get('/default', async (_req, res) => {
  let [canvas] = await db.select().from(schema.canvases).where(eq(schema.canvases.isActive, true))

  if (!canvas) {
    const id = nanoid()
    await db.insert(schema.canvases).values({ id, name: 'Main Canvas', isActive: true })
    ;[canvas] = await db.select().from(schema.canvases).where(eq(schema.canvases.id, id))
  }

  const workflowsList = await db.select().from(schema.workflows).where(eq(schema.workflows.canvasId, canvas.id))
  let nodes: (typeof schema.workflowNodes.$inferSelect)[] = []
  let edgesList: (typeof schema.edges.$inferSelect)[] = []

  for (const w of workflowsList) {
    const wNodes = await db.select().from(schema.workflowNodes).where(eq(schema.workflowNodes.workflowId, w.id))
    nodes = nodes.concat(wNodes)
    const wEdges = await db.select().from(schema.edges).where(eq(schema.edges.workflowId, w.id))
    edgesList = edgesList.concat(wEdges)
  }

  res.json({ canvas, workflows: workflowsList, nodes, edges: edgesList })
})

router.post('/', async (req, res) => {
  const id = nanoid()
  const { name, description } = req.body as { name: string; description?: string }
  const canvas = {
    id,
    name: name || 'Untitled Canvas',
    description: description ?? null,
  }
  await db.insert(schema.canvases).values(canvas)
  const [result] = await db.select().from(schema.canvases).where(eq(schema.canvases.id, id))
  res.status(201).json(result)
})

router.get('/:id', async (req, res) => {
  const { id } = req.params
  const [canvas] = await db.select().from(schema.canvases).where(eq(schema.canvases.id, id))
  if (!canvas) { res.status(404).json({ error: 'Canvas not found' }); return }

  const workflowsList = await db.select().from(schema.workflows).where(eq(schema.workflows.canvasId, id))
  const workflowIds = workflowsList.map((w) => w.id)

  let nodes: (typeof schema.workflowNodes.$inferSelect)[] = []
  let edgesList: (typeof schema.edges.$inferSelect)[] = []

  if (workflowIds.length > 0) {
    for (const wid of workflowIds) {
      const wNodes = await db.select().from(schema.workflowNodes).where(eq(schema.workflowNodes.workflowId, wid))
      nodes = nodes.concat(wNodes)
      const wEdges = await db.select().from(schema.edges).where(eq(schema.edges.workflowId, wid))
      edgesList = edgesList.concat(wEdges)
    }
  }

  res.json({ canvas, workflows: workflowsList, nodes, edges: edgesList })
})

/** Bulk save: replace all nodes+edges for a canvas's default workflow */
router.put('/:id/state', async (req, res) => {
  const { id: canvasId } = req.params
  const { nodes, edges: edgesList } = req.body as {
    nodes: Array<{
      id: string
      typeId: string
      label: string
      positionX: number
      positionY: number
      config: Record<string, unknown>
    }>
    edges: Array<{
      id: string
      sourceNodeId: string
      sourcePortId: string
      targetNodeId: string
      targetPortId: string
    }>
  }

  // Ensure canvas exists
  const [canvas] = await db.select().from(schema.canvases).where(eq(schema.canvases.id, canvasId))
  if (!canvas) { res.status(404).json({ error: 'Canvas not found' }); return }

  // Get or create default workflow
  let [workflow] = await db.select().from(schema.workflows).where(eq(schema.workflows.canvasId, canvasId))
  if (!workflow) {
    const wid = nanoid()
    await db.insert(schema.workflows).values({ id: wid, canvasId, name: 'Default' })
    ;[workflow] = await db.select().from(schema.workflows).where(eq(schema.workflows.id, wid))
  }

  const workflowId = workflow.id

  // Delete existing nodes and edges for this workflow (cascade will handle edges via FK)
  await db.delete(schema.edges).where(eq(schema.edges.workflowId, workflowId))
  await db.delete(schema.workflowNodes).where(eq(schema.workflowNodes.workflowId, workflowId))

  // Insert nodes
  if (nodes.length > 0) {
    await db.insert(schema.workflowNodes).values(
      nodes.map((n) => ({
        id: n.id,
        workflowId,
        nodeTypeId: n.typeId,
        label: n.label,
        positionX: n.positionX,
        positionY: n.positionY,
        config: n.config,
      })),
    )
  }

  // Insert edges
  if (edgesList.length > 0) {
    await db.insert(schema.edges).values(
      edgesList.map((e) => ({
        id: e.id,
        workflowId,
        sourceNodeId: e.sourceNodeId,
        sourcePortId: e.sourcePortId,
        targetNodeId: e.targetNodeId,
        targetPortId: e.targetPortId,
      })),
    )
  }

  res.json({ ok: true, nodeCount: nodes.length, edgeCount: edgesList.length })
})

router.patch('/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body as Partial<typeof schema.canvases.$inferInsert>
  await db.update(schema.canvases).set({ ...updates, updatedAt: new Date() }).where(eq(schema.canvases.id, id))
  const [result] = await db.select().from(schema.canvases).where(eq(schema.canvases.id, id))
  res.json(result)
})

router.delete('/:id', async (req, res) => {
  await db.delete(schema.canvases).where(eq(schema.canvases.id, req.params.id))
  res.status(204).end()
})

export default router
