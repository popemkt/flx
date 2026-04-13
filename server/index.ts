import { createAppServer } from './app.js'

const { server } = createAppServer()

const PORT = process.env.PORT ?? process.env.FLX_PORT ?? 3210
server.listen(PORT, () => {
  console.log(`[flx-server] running on http://localhost:${PORT}`)
})
