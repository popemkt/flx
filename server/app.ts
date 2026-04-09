import express from 'express'
import { createServer } from 'http'
import { setupWebSocket } from './ws.js'
import { dbReady } from './db.js'
import canvasRoutes from './routes/canvases.js'
import workflowRoutes from './routes/workflows.js'
import nodeRoutes from './routes/nodes.js'
import edgeRoutes from './routes/edges.js'
import executionRoutes from './routes/execution.js'
import ptyRoutes from './routes/pty.js'

export function createApp() {
  const app = express()

  app.use(express.json())
  app.use(async (_req, _res, next) => {
    await dbReady
    next()
  })

  app.use('/api/v1/canvases', canvasRoutes)
  app.use('/api/v1/canvases', workflowRoutes)
  app.use('/api/v1', nodeRoutes)
  app.use('/api/v1', edgeRoutes)
  app.use('/api/v1', executionRoutes)
  app.use('/api/v1', ptyRoutes)

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  return app
}

export function createAppServer() {
  const app = createApp()
  const server = createServer(app)
  setupWebSocket(server)
  return { app, server }
}
