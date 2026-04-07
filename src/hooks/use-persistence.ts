import { useEffect, useRef, useCallback } from 'react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCanvasStore } from '@/stores/canvas.store'
import { getNodeDefinition } from '@/canvas/node-types-registry'
import type { FlxNodeData } from '@/types/node'
import type { Node, Edge } from '@xyflow/react'

/** Serialize canvas state to API format */
function serializeNodes(nodes: Node<FlxNodeData>[]) {
  return nodes.map((n) => ({
    id: n.id,
    typeId: n.data.definition.id,
    label: n.data.label,
    positionX: n.position.x,
    positionY: n.position.y,
    config: n.data.config,
  }))
}

function serializeEdges(edges: Edge[]) {
  return edges.map((e) => ({
    id: e.id,
    sourceNodeId: e.source,
    sourcePortId: e.sourceHandle ?? '',
    targetNodeId: e.target,
    targetPortId: e.targetHandle ?? '',
  }))
}

/** Deserialize DB rows back to React Flow nodes */
function deserializeNodes(
  dbNodes: Array<{
    id: string
    nodeTypeId: string
    label: string
    positionX: number
    positionY: number
    config: Record<string, unknown> | null
  }>,
): Node<FlxNodeData>[] {
  return dbNodes
    .map((n) => {
      const definition = getNodeDefinition(n.nodeTypeId)
      if (!definition) return null
      return {
        id: n.id,
        type: n.nodeTypeId,
        position: { x: n.positionX, y: n.positionY },
        data: {
          definition,
          config: n.config ?? definition.defaultConfig ?? {},
          label: n.label,
          workflowId: '',
        },
      } satisfies Node<FlxNodeData>
    })
    .filter((n): n is Node<FlxNodeData> => n !== null)
}

/** Deserialize DB rows back to React Flow edges */
function deserializeEdges(
  dbEdges: Array<{
    id: string
    sourceNodeId: string
    sourcePortId: string
    targetNodeId: string
    targetPortId: string
  }>,
): Edge[] {
  return dbEdges.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    sourceHandle: e.sourcePortId,
    target: e.targetNodeId,
    targetHandle: e.targetPortId,
  }))
}

export function usePersistence() {
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const setNodes = useWorkflowStore((s) => s.setNodes)
  const setEdges = useWorkflowStore((s) => s.setEdges)
  const canvasId = useCanvasStore((s) => s.activeCanvasId)
  const setActiveCanvas = useCanvasStore((s) => s.setActiveCanvas)

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const loadedRef = useRef(false)
  const skipNextSave = useRef(false)

  // Load canvas state on mount
  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true

    async function load() {
      try {
        const res = await fetch('/api/v1/canvases/default')
        if (!res.ok) return
        const data = await res.json()

        setActiveCanvas(data.canvas.id)

        if (data.nodes.length > 0 || data.edges.length > 0) {
          skipNextSave.current = true
          setNodes(deserializeNodes(data.nodes))
          setEdges(deserializeEdges(data.edges))
        }
      } catch (err) {
        console.error('[persistence] failed to load:', err)
      }
    }

    load()
  }, [setNodes, setEdges, setActiveCanvas])

  // Debounced save on changes
  const save = useCallback(() => {
    if (!canvasId) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    const currentNodes = useWorkflowStore.getState().nodes
    const currentEdges = useWorkflowStore.getState().edges

    fetch(`/api/v1/canvases/${canvasId}/state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nodes: serializeNodes(currentNodes),
        edges: serializeEdges(currentEdges),
      }),
    }).catch((err) => console.error('[persistence] save failed:', err))
  }, [canvasId])

  useEffect(() => {
    if (!canvasId) return

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(save, 500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [nodes, edges, canvasId, save])
}
