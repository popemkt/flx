import express from 'express'
import { createServer } from 'http'
import { setupWebSocket } from './ws.js'
import canvasRoutes from './routes/canvases.js'
import workflowRoutes from './routes/workflows.js'
import nodeRoutes from './routes/nodes.js'
import edgeRoutes from './routes/edges.js'
import executionRoutes from './routes/execution.js'
import ptyRoutes from './routes/pty.js'

const app = express()
const server = createServer(app)

app.use(express.json())

// API routes
app.use('/api/v1/canvases', canvasRoutes)
app.use('/api/v1/canvases', workflowRoutes)  // nested under canvases for creation
app.use('/api/v1', nodeRoutes)
app.use('/api/v1', edgeRoutes)
app.use('/api/v1', executionRoutes)
app.use('/api/v1', ptyRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// WebSocket
setupWebSocket(server)

const PORT = process.env.FLX_PORT ?? 3210
server.listen(PORT, () => {
  console.log(`[flx-server] running on http://localhost:${PORT}`)
})
