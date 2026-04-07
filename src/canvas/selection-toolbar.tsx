import { Panel } from '@xyflow/react'
import { Play, Copy, Trash2 } from 'lucide-react'
import { useRunWorkflow } from '@/hooks/use-execution'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCallback, useMemo } from 'react'
import { nanoid } from 'nanoid'

export function SelectionToolbar() {
  const { runSelection, status, selectedCount } = useRunWorkflow()
  const nodes = useWorkflowStore((s) => s.nodes)
  const addNode = useWorkflowStore((s) => s.addNode)
  const removeNode = useWorkflowStore((s) => s.removeNode)

  const selectedNodes = useMemo(
    () => nodes.filter((n) => n.selected),
    [nodes],
  )

  const handleDuplicate = useCallback(() => {
    for (const node of selectedNodes) {
      const id = nanoid()
      addNode({
        id,
        type: node.type!,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
        data: { ...node.data, config: { ...node.data.config } },
      })
    }
  }, [selectedNodes, addNode])

  const handleDelete = useCallback(() => {
    for (const node of selectedNodes) {
      removeNode(node.id)
    }
  }, [selectedNodes, removeNode])

  if (selectedCount === 0) return null

  return (
    <Panel position="top-left" className="!m-3">
      <div className="flex items-center gap-1 bg-card border rounded-lg shadow-lg px-2 py-1.5">
        <span className="text-xs text-muted-foreground px-1.5">
          {selectedCount} selected
        </span>

        <div className="w-px h-4 bg-border mx-0.5" />

        <button
          onClick={runSelection}
          disabled={status === 'running'}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
        >
          <Play className="w-3 h-3" />
          Run Selection
        </button>

        <button
          onClick={handleDuplicate}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Duplicate selected"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDelete}
          className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-red-400 transition-colors"
          title="Delete selected"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </Panel>
  )
}
