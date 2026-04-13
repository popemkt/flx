import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

describe('server app', () => {
  let tempDir: string

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'flx-test-'))
    process.env.FLX_DB_PATH = join(tempDir, 'flx.db')
    vi.resetModules()
  })

  afterEach(async () => {
    delete process.env.FLX_DB_PATH
    vi.resetModules()
    await rm(tempDir, { recursive: true, force: true })
  })

  it('returns health information', async () => {
    const { createApp } = await import('./app')
    const app = createApp()

    const response = await request(app).get('/api/health').expect(200)

    expect(response.body.status).toBe('ok')
    expect(response.body.timestamp).toEqual(expect.any(String))
  })

  it('creates and persists the default canvas state', async () => {
    const { createApp } = await import('./app')
    const app = createApp()

    const defaultCanvasResponse = await request(app).get('/api/v1/canvases/default').expect(200)
    const canvasId = defaultCanvasResponse.body.canvas.id as string

    await request(app)
      .put(`/api/v1/canvases/${canvasId}/state`)
      .send({
        nodes: [
          {
            id: 'node-1',
            typeId: 'text-input',
            label: 'Text Input',
            positionX: 120,
            positionY: 180,
            config: { value: 'hello' },
          },
        ],
        edges: [],
      })
      .expect(200)

    const persistedCanvasResponse = await request(app).get('/api/v1/canvases/default').expect(200)

    expect(persistedCanvasResponse.body.nodes).toHaveLength(1)
    expect(persistedCanvasResponse.body.nodes[0]).toMatchObject({
      id: 'node-1',
      nodeTypeId: 'text-input',
      label: 'Text Input',
      positionX: 120,
      positionY: 180,
    })
  })
})
