import { Router } from 'express'
import { db, schema } from '../db.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

const router = Router()

router.get('/', async (_req, res) => {
  const all = await db.select().from(schema.canvases)
  res.json(all)
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
