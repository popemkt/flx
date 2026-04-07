import { useEffect } from 'react'
import { ensureConnected, addMessageHandler } from '@/lib/ws-client'

export function useWebSocket(handler?: (msg: Record<string, unknown>) => void) {
  useEffect(() => {
    ensureConnected()
    if (handler) {
      return addMessageHandler(handler)
    }
  }, [handler])
}
