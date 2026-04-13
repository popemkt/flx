import { spawn } from 'child_process'

export interface ScriptResult {
  exitCode: number
  stdout: string
  stderr: string
}

export function runScript(params: {
  command: string
  cwd?: string
  shell?: 'powershell' | 'bash'
  signal?: AbortSignal
}): Promise<ScriptResult> {
  const { command, cwd, shell = 'powershell', signal } = params

  return new Promise((resolve, reject) => {
    const shellCmd = shell === 'powershell' ? 'pwsh' : 'bash'
    const shellArgs = shell === 'powershell' ? ['-NoProfile', '-Command', command] : ['-c', command]

    const proc = spawn(shellCmd, shellArgs, {
      cwd: cwd || process.cwd(),
      env: { ...process.env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr })
    })

    proc.on('error', (err) => {
      reject(err)
    })

    if (signal) {
      signal.addEventListener('abort', () => {
        proc.kill('SIGTERM')
        reject(new Error('Script execution aborted'))
      })
    }
  })
}
