import { spawn, type ChildProcess } from 'child_process'
import { nanoid } from 'nanoid'

export interface Session {
  id: string
  title: string
  process: ChildProcess
  stdout: string
  stderr: string
  exitCode: number | null
  createdAt: number
}

type SessionEventHandler = {
  onData: (sessionId: string, data: string) => void
  onExit: (sessionId: string, code: number, stdout: string, stderr: string) => void
}

class SessionManager {
  private sessions = new Map<string, Session>()
  private eventHandler: SessionEventHandler | null = null

  setEventHandler(handler: SessionEventHandler) {
    this.eventHandler = handler
  }

  createScriptSession(params: {
    command: string
    shell?: 'powershell' | 'bash'
    cwd?: string
    title?: string
  }): string {
    const id = nanoid()
    const { command, shell = 'powershell', cwd } = params

    const shellCmd = shell === 'powershell' ? 'pwsh' : 'bash'
    const shellArgs =
      shell === 'powershell'
        ? ['-NoProfile', '-Command', command]
        : ['-c', command]

    const proc = spawn(shellCmd, shellArgs, {
      cwd: cwd || process.cwd(),
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const session: Session = {
      id,
      title: params.title ?? `Script ${id.slice(0, 6)}`,
      process: proc,
      stdout: '',
      stderr: '',
      exitCode: null,
      createdAt: Date.now(),
    }

    proc.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      session.stdout += text
      this.eventHandler?.onData(id, text)
    })

    proc.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      session.stderr += text
      // Stream stderr with ANSI red coloring
      this.eventHandler?.onData(id, `\x1b[31m${text}\x1b[0m`)
    })

    proc.on('close', (code) => {
      session.exitCode = code ?? 1
      this.eventHandler?.onExit(id, session.exitCode, session.stdout, session.stderr)
    })

    proc.on('error', (err) => {
      session.exitCode = 1
      session.stderr += err.message
      this.eventHandler?.onData(id, `\x1b[31mError: ${err.message}\x1b[0m\r\n`)
      this.eventHandler?.onExit(id, 1, session.stdout, session.stderr)
    })

    this.sessions.set(id, session)
    return id
  }

  /** Write to session stdin (for future interactive use) */
  writeToSession(sessionId: string, data: string): boolean {
    const session = this.sessions.get(sessionId)
    if (!session || session.exitCode !== null) return false
    session.process.stdin?.write(data)
    return true
  }

  getSession(id: string): Session | undefined {
    return this.sessions.get(id)
  }

  listSessions(): Array<{ id: string; title: string; exitCode: number | null; createdAt: number }> {
    return [...this.sessions.values()].map((s) => ({
      id: s.id,
      title: s.title,
      exitCode: s.exitCode,
      createdAt: s.createdAt,
    }))
  }

  killSession(id: string): boolean {
    const session = this.sessions.get(id)
    if (!session) return false
    if (session.exitCode === null) {
      session.process.kill('SIGTERM')
    }
    this.sessions.delete(id)
    return true
  }

  /** Wait for session to exit, returns stdout/stderr/exitCode */
  waitForExit(id: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const session = this.sessions.get(id)
    if (!session) return Promise.reject(new Error(`Session ${id} not found`))
    if (session.exitCode !== null) {
      return Promise.resolve({
        stdout: session.stdout,
        stderr: session.stderr,
        exitCode: session.exitCode,
      })
    }
    return new Promise((resolve) => {
      session.process.on('close', () => {
        resolve({
          stdout: session.stdout,
          stderr: session.stderr,
          exitCode: session.exitCode ?? 1,
        })
      })
    })
  }
}

export const sessionManager = new SessionManager()
