import { useEffect, useState } from 'react'
import { History, CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/cn'

interface NodeLog {
  nodeId: string
  typeId: string
  label: string
  status: 'success' | 'error'
  inputs: Record<string, unknown>
  outputs: Record<string, unknown>
  error?: string
  sessionId?: string
  startedAt: number
  completedAt: number
  durationMs: number
}

interface ExecutionRecord {
  id: string
  workflowId: string | null
  status: string
  startedAt: string
  completedAt: string | null
  durationMs: number | null
  triggerType: string
  nodeResults: Record<string, NodeLog> | null
  error: string | null
  createdAt: string
}

function formatDuration(ms: number | null): string {
  if (ms === null) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function ExecutionRow({ exec }: { exec: ExecutionRecord }) {
  const [expanded, setExpanded] = useState(false)
  const nodeResults = exec.nodeResults ? Object.values(exec.nodeResults) : []

  return (
    <div className="border-b last:border-b-0">
      <button
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
        )}

        {exec.status === 'success' ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
        )}

        <span className="text-xs truncate flex-1">
          {nodeResults.length} node{nodeResults.length !== 1 ? 's' : ''}
        </span>

        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatDuration(exec.durationMs)}
        </span>

        <span className="text-[10px] text-muted-foreground shrink-0">
          {formatTime(exec.startedAt)}
        </span>
      </button>

      {expanded && (
        <div className="px-3 pb-2">
          {exec.error && (
            <div className="text-xs text-red-400 font-mono mb-2 px-2">{exec.error}</div>
          )}

          {nodeResults.map((log) => (
            <div key={log.nodeId} className="flex items-start gap-2 py-1 px-2 rounded hover:bg-muted/30">
              {log.status === 'success' ? (
                <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium truncate">{log.label}</span>
                  <span className="text-[10px] text-muted-foreground">({log.typeId})</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{log.durationMs}ms</span>
                </div>

                {log.error && (
                  <div className="text-[10px] text-red-400 font-mono mt-0.5">{log.error}</div>
                )}

                {log.outputs && Object.keys(log.outputs).length > 0 && (
                  <pre className="text-[10px] text-muted-foreground font-mono mt-0.5 truncate max-w-full">
                    {Object.entries(log.outputs)
                      .map(([k, v]) => `${k}: ${typeof v === 'string' ? v.trim().slice(0, 60) : JSON.stringify(v)}`)
                      .join(', ')}
                  </pre>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ExecutionHistoryPanel({ onClose }: { onClose: () => void }) {
  const [executions, setExecutions] = useState<ExecutionRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/v1/execution?limit=20')
      .then((r) => r.json())
      .then(setExecutions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="w-[300px] border-l bg-card flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b shrink-0">
        <History className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-sm font-medium flex-1">Execution History</span>
        <button
          onClick={onClose}
          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Execution list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Clock className="w-4 h-4 text-muted-foreground animate-spin" />
          </div>
        ) : executions.length === 0 ? (
          <div className="text-xs text-muted-foreground text-center py-8">
            No executions yet
          </div>
        ) : (
          executions.map((exec) => <ExecutionRow key={exec.id} exec={exec} />)
        )}
      </div>
    </div>
  )
}
