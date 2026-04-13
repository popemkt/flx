import { Router } from 'express'
import { sessionManager } from '../services/session-manager.js'

const router = Router()

/** Create a new streaming script session */
router.post('/pty/sessions', (req, res) => {
  const { command, shell, cwd, title } = req.body as {
    command: string
    shell?: 'powershell' | 'bash'
    cwd?: string
    title?: string
  }

  if (!command) {
    res.status(400).json({ error: 'command is required' })
    return
  }

  const sessionId = sessionManager.createScriptSession({ command, shell, cwd, title })
  res.json({ sessionId })
})

/** List active sessions */
router.get('/pty/sessions', (_req, res) => {
  res.json(sessionManager.listSessions())
})

/** Get session result (blocks until process exits if still running) */
router.get('/pty/sessions/:id/result', async (req, res) => {
  try {
    const result = await sessionManager.waitForExit(req.params.id)
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(404).json({ error: msg })
  }
})

/** Kill a session */
router.delete('/pty/sessions/:id', (req, res) => {
  const ok = sessionManager.killSession(req.params.id)
  if (!ok) {
    res.status(404).json({ error: 'Session not found' })
    return
  }
  res.json({ ok: true })
})

/** Run a script with streaming, wait for result */
router.post('/pty/run-script', async (req, res) => {
  const { command, shell, cwd, title } = req.body as {
    command: string
    shell?: 'powershell' | 'bash'
    cwd?: string
    title?: string
  }

  if (!command) {
    res.status(400).json({ error: 'command is required' })
    return
  }

  const sessionId = sessionManager.createScriptSession({ command, shell, cwd, title })

  try {
    const result = await sessionManager.waitForExit(sessionId)
    res.json({ sessionId, ...result })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: msg })
  }
})

export default router
