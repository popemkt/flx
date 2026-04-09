type MessageHandler = (msg: Record<string, unknown>) => void

let ws: WebSocket | null = null
const handlers = new Set<MessageHandler>()
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let outboundQueue: string[] = []

function getWsUrl(): string {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}/ws`
}

function connect() {
  if (ws?.readyState === WebSocket.OPEN || ws?.readyState === WebSocket.CONNECTING) return

  ws = new WebSocket(getWsUrl())

  ws.onopen = () => {
    console.log('[ws] connected')
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    for (const message of outboundQueue) {
      ws?.send(message)
    }
    outboundQueue = []
  }

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string)
      for (const handler of handlers) {
        handler(msg)
      }
    } catch {
      // ignore invalid messages
    }
  }

  ws.onclose = () => {
    console.log('[ws] disconnected, reconnecting in 2s...')
    reconnectTimer = setTimeout(connect, 2000)
  }

  ws.onerror = () => {
    ws?.close()
  }
}

export function getWebSocket(): WebSocket | null {
  return ws
}

export function ensureConnected(): void {
  connect()
}

export function addMessageHandler(handler: MessageHandler): () => void {
  handlers.add(handler)
  return () => handlers.delete(handler)
}

export function sendMessage(msg: Record<string, unknown>): void {
  const payload = JSON.stringify(msg)
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(payload)
    return
  }
  outboundQueue.push(payload)
  connect()
}
