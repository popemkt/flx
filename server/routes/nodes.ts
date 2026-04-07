import { Router } from 'express'
import { db, schema } from '../db.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

const router = Router()

router.post('/workflows/:workflowId/nodes', async (req, res) => {
  const id = nanoid()
  const { workflowId } = req.params
  const { nodeTypeId, label, positionX, positionY, config } = req.body as {
    nodeTypeId: string
    label: string
    positionX?: number
    positionY?: number
    config?: Record<string, unknown>
  }
  await db.insert(schema.workflowNodes).values({
    id,
    workflowId,
    nodeTypeId,
    label: label || 'Node',
    positionX: positionX ?? 0,
    positionY: positionY ?? 0,
    config: config ?? null,
  })
  const [result] = await db.select().from(schema.workflowNodes).where(eq(schema.workflowNodes.id, id))
  res.status(201).json(result)
})

router.patch('/nodes/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body as Partial<typeof schema.workflowNodes.$inferInsert>
  await db.update(schema.workflowNodes).set({ ...updates, updatedAt: new Date() }).where(eq(schema.workflowNodes.id, id))
  const [result] = await db.select().from(schema.workflowNodes).where(eq(schema.workflowNodes.id, id))
  res.json(result)
})

router.patch('/nodes/batch-position', async (req, res) => {
  const updates = req.body as Array<{ id: string; positionX: number; positionY: number }>
  for (const { id, positionX, positionY } of updates) {
    await db.update(schema.workflowNodes)
      .set({ positionX, positionY, updatedAt: new Date() })
      .where(eq(schema.workflowNodes.id, id))
  }
  res.json({ ok: true })
})

router.delete('/nodes/:id', async (req, res) => {
  await db.delete(schema.workflowNodes).where(eq(schema.workflowNodes.id, req.params.id))
  res.status(204).end()
})

export default router
