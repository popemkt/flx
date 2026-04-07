import { useNodeExecutionState } from '@/stores/execution.store'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

export function NodeStatus({ nodeId }: { nodeId: string }) {
  const { status } = useNodeExecutionState(nodeId)

  if (status === 'idle') return null

  return (
    <div className="flex items-center gap-1 text-[10px]">
      {status === 'running' && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
      {status === 'success' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
      {status === 'error' && <XCircle className="w-3 h-3 text-red-400" />}
    </div>
  )
}
