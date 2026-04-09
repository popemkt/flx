import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import { sessionManager } from './services/session-manager.js'

export type ClientMessage =
  | { type: 'pty:subscribe'; sessionId: string }
  | { type: 'pty:unsubscribe'; sessionId: string }
  | { type: 'pty:input'; sessionId: string; data: string }
  | { type: 'pty:resize'; sessionId: string; cols: number; rows: number }
  | { type: 'execution:subscribe'; executionId: string }
  | { type: 'execution:unsubscribe'; executionId: string }

export type ServerMessage =
  | { type: 'pty:data'; sessionId: string; data: string }
  | { type: 'pty:exit'; sessionId: string; exitCode: number }
  | { type: 'pty:error'; sessionId: string; message: string }
  | { type: 'execution:node-start'; executionId: string; nodeId: string }
  | { type: 'execution:node-complete'; executionId: string; nodeId: string; result: Record<string, unknown> }
  | { type: 'execution:node-error'; executionId: string; nodeId: string; error: string }
  | { type: 'execution:complete'; executionId: string; status: 'success' | 'error' | 'cancelled' }
  | { type: 'execution:session-created'; executionId: string; nodeId: string; sessionId: string; title: string }
  | { type: 'node-types:updated'; added: string[]; removed: string[] }
  | { type: 'error'; message: string }

const clients = new Set<WebSocket>()

/** Map sessionId -> Set of subscribed WebSocket clients */
const sessionSubscriptions = new Map<string, Set<WebSocket>>()
const executionSubscriptions = new Map<string, Set<WebSocket>>()

let wss: WebSocketServer

function sendToClient(ws: WebSocket, message: ServerMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message))
  }
}

function subscribeClientToSession(sessionId: string, ws: WebSocket) {
  let subs = sessionSubscriptions.get(sessionId)
  if (!subs) {
    subs = new Set()
    sessionSubscriptions.set(sessionId, subs)
  }
  subs.add(ws)

  const replay = sessionManager.getSessionReplay(sessionId)
  if (!replay) return
  if (replay.buffer) {
    sendToClient(ws, { type: 'pty:data', sessionId, data: replay.buffer })
  }
  if (replay.exitCode !== null) {
    sendToClient(ws, { type: 'pty:exit', sessionId, exitCode: replay.exitCode })
  }
}

function sendToSessionSubscribers(sessionId: string, message: ServerMessage) {
  const subs = sessionSubscriptions.get(sessionId)
  if (!subs) return
  const data = JSON.stringify(message)
  for (const client of subs) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

export function publishToExecutionSubscribers(executionId: string, message: ServerMessage): void {
  const subs = executionSubscriptions.get(executionId)
  if (!subs) return
  const data = JSON.stringify(message)
  for (const client of subs) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}

export function setupWebSocket(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' })

  // Wire session manager events to WebSocket
  sessionManager.setEventHandler({
    onData(sessionId, data) {
      sendToSessionSubscribers(sessionId, { type: 'pty:data', sessionId, data })
    },
    onExit(sessionId, exitCode) {
      sendToSessionSubscribers(sessionId, { type: 'pty:exit', sessionId, exitCode })
    },
  })

  wss.on('connection', (ws) => {
    clients.add(ws)

    ws.on('close', () => {
      clients.delete(ws)
      // Clean up subscriptions for this client
      for (const [, subs] of sessionSubscriptions) {
        subs.delete(ws)
      }
      for (const [, subs] of executionSubscriptions) {
        subs.delete(ws)
      }
    })

    ws.on('error', () => {
      clients.delete(ws)
      for (const [, subs] of sessionSubscriptions) {
        subs.delete(ws)
      }
      for (const [, subs] of executionSubscriptions) {
        subs.delete(ws)
      }
    })

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as ClientMessage
        handleClientMessage(ws, msg)
      } catch {
        sendToClient(ws, { type: 'error', message: 'Invalid message' })
      }
    })
  })

  return wss
}

function handleClientMessage(ws: WebSocket, msg: ClientMessage) {
  switch (msg.type) {
    case 'pty:subscribe': {
      subscribeClientToSession(msg.sessionId, ws)
      break
    }

    case 'pty:unsubscribe': {
      const subs = sessionSubscriptions.get(msg.sessionId)
      if (subs) {
        subs.delete(ws)
        if (subs.size === 0) sessionSubscriptions.delete(msg.sessionId)
      }
      break
    }

    case 'pty:input': {
      const ok = sessionManager.writeToSession(msg.sessionId, msg.data)
      if (!ok) {
        sendToClient(ws, {
          type: 'pty:error',
          sessionId: msg.sessionId,
          message: 'Session not found or already exited',
        })
      }
      break
    }

    case 'pty:resize': {
      // resize not applicable for spawn-based sessions (will matter for node-pty in Phase 6)
      break
    }

    case 'execution:subscribe': {
      let subs = executionSubscriptions.get(msg.executionId)
      if (!subs) {
        subs = new Set()
        executionSubscriptions.set(msg.executionId, subs)
      }
      subs.add(ws)
      break
    }

    case 'execution:unsubscribe':
      {
        const subs = executionSubscriptions.get(msg.executionId)
        if (subs) {
          subs.delete(ws)
          if (subs.size === 0) executionSubscriptions.delete(msg.executionId)
        }
      }
      break
  }
}

export function broadcast(message: ServerMessage): void {
  const data = JSON.stringify(message)
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data)
    }
  }
}
