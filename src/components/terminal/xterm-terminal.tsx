import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { addMessageHandler, sendMessage, ensureConnected } from '@/lib/ws-client'

interface XtermTerminalProps {
  sessionId: string
  isActive: boolean
}

export function XtermTerminal({ sessionId, isActive }: XtermTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current) return

    const terminal = new Terminal({
      fontSize: 13,
      fontFamily: '"Cascadia Code", "Fira Code", "JetBrains Mono", Menlo, monospace',
      theme: {
        background: '#0a0a0a',
        foreground: '#e4e4e7',
        cursor: '#e4e4e7',
        selectionBackground: '#3b82f644',
        black: '#18181b',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#e4e4e7',
        brightBlack: '#52525b',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#fafafa',
      },
      cursorBlink: false,
      scrollback: 5000,
      convertEol: true,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.loadAddon(new WebLinksAddon())
    terminal.open(containerRef.current)

    // Delay fit to ensure container has dimensions
    requestAnimationFrame(() => {
      try {
        fitAddon.fit()
      } catch {
        // ignore fit errors during mount race
      }
    })

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // Subscribe to session data via WebSocket
    ensureConnected()
    sendMessage({ type: 'pty:subscribe', sessionId })

    const removeHandler = addMessageHandler((msg) => {
      if (msg.type === 'pty:data' && msg.sessionId === sessionId) {
        terminal.write(msg.data as string)
      }
      if (msg.type === 'pty:exit' && msg.sessionId === sessionId) {
        terminal.write(`\r\n\x1b[90m--- Process exited with code ${msg.exitCode} ---\x1b[0m\r\n`)
      }
      if (msg.type === 'pty:error' && msg.sessionId === sessionId) {
        terminal.write(`\r\n\x1b[31mError: ${msg.message}\x1b[0m\r\n`)
      }
    })

    // Forward terminal input to server (for future interactive sessions)
    const onDataDisposable = terminal.onData((data) => {
      sendMessage({ type: 'pty:input', sessionId, data })
    })

    return () => {
      onDataDisposable.dispose()
      removeHandler()
      sendMessage({ type: 'pty:unsubscribe', sessionId })
      terminal.dispose()
      terminalRef.current = null
      fitAddonRef.current = null
    }
  }, [sessionId])

  // Re-fit when tab becomes active or container resizes
  useEffect(() => {
    if (!isActive) return

    const fitAddon = fitAddonRef.current
    if (fitAddon) {
      requestAnimationFrame(() => {
        try {
          fitAddon.fit()
        } catch {
          // ignore
        }
      })
    }

    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        try {
          fitAddon?.fit()
        } catch {
          // ignore
        }
      })
    })

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [isActive])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ display: isActive ? 'block' : 'none' }}
    />
  )
}
