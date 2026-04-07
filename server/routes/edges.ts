import { Router } from 'express'
import { db, schema } from '../db.js'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'

const router = Router()

router.post('/workflows/:workflowId/edges', async (req, res) => {
  const id = nanoid()
  const { workflowId } = req.params
  const { sourceNodeId, sourcePortId, targetNodeId, targetPortId } = req.body as {
    sourceNodeId: string
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
  }
  await db.insert(schema.edges).values({
    id,
    workflowId,
    sourceNodeId,
    sourcePortId,
    targetNodeId,
    targetPortId,
  })
  const [result] = await db.select().from(schema.edges).where(eq(schema.edges.id, id))
  res.status(201).json(result)
})

router.delete('/edges/:id', async (req, res) => {
  await db.delete(schema.edges).where(eq(schema.edges.id, req.params.id))
  res.status(204).end()
})

export default router
