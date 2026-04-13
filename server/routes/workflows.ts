import { Router } from 'express'
import { db, schema } from '../db.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

const router = Router()

router.post('/:canvasId/workflows', async (req, res) => {
  const id = nanoid()
  const { canvasId } = req.params
  const { name, description, positionX, positionY, color } = req.body as {
    name: string
    description?: string
    positionX?: number
    positionY?: number
    color?: string
  }
  await db.insert(schema.workflows).values({
    id,
    canvasId,
    name: name || 'Untitled Workflow',
    description: description ?? null,
    positionX: positionX ?? 0,
    positionY: positionY ?? 0,
    color: color ?? null,
  })
  const [result] = await db.select().from(schema.workflows).where(eq(schema.workflows.id, id))
  res.status(201).json(result)
})

router.patch('/workflows/:id', async (req, res) => {
  const { id } = req.params
  const updates = req.body as Partial<typeof schema.workflows.$inferInsert>
  await db.update(schema.workflows).set({ ...updates, updatedAt: new Date() }).where(eq(schema.workflows.id, id))
  const [result] = await db.select().from(schema.workflows).where(eq(schema.workflows.id, id))
  res.json(result)
})

router.delete('/workflows/:id', async (req, res) => {
  await db.delete(schema.workflows).where(eq(schema.workflows.id, req.params.id))
  res.status(204).end()
})

export default router
