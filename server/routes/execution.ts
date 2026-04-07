import { Router } from 'express'
import { runScript } from '../services/script-executor.js'

const router = Router()

// Run a script directly (used by the execution engine via client -> server call)
router.post('/execution/run-script', async (req, res) => {
  const { command, cwd, shell } = req.body as {
    command: string
    cwd?: string
    shell?: 'powershell' | 'bash'
  }

  if (!command) {
    res.status(400).json({ error: 'command is required' })
    return
  }

  try {
    const result = await runScript({ command, cwd, shell })
    res.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: msg })
  }
})

export default router
