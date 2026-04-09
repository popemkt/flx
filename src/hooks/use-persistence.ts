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
  const nodes: Node<FlxNodeData>[] = []

  for (const n of dbNodes) {
    const definition = getNodeDefinition(n.nodeTypeId)
    if (!definition) continue

    nodes.push({
      id: n.id,
      type: n.nodeTypeId,
      position: { x: n.positionX, y: n.positionY },
      data: {
        definition,
        config: n.config ?? definition.defaultConfig ?? {},
        label: n.label,
        workflowId: '',
      },
    })
  }

  return nodes
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
  const saveInFlightRef = useRef(false)
  const queuedSnapshotRef = useRef<{ nodes: ReturnType<typeof serializeNodes>; edges: ReturnType<typeof serializeEdges> } | null>(null)

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
  const save = useCallback(async (snapshot: { nodes: ReturnType<typeof serializeNodes>; edges: ReturnType<typeof serializeEdges> }) => {
    if (!canvasId) return
    if (skipNextSave.current) {
      skipNextSave.current = false
      return
    }

    if (saveInFlightRef.current) {
      queuedSnapshotRef.current = snapshot
      return
    }

    saveInFlightRef.current = true

    try {
      const res = await fetch(`/api/v1/canvases/${canvasId}/state`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshot),
      })
      if (!res.ok) {
        throw new Error(`Save failed with status ${res.status}`)
      }
    } catch (err) {
      console.error('[persistence] save failed:', err)
    } finally {
      saveInFlightRef.current = false
      const queued = queuedSnapshotRef.current
      queuedSnapshotRef.current = null
      if (queued) {
        void save(queued)
      }
    }
  }, [canvasId])

  useEffect(() => {
    if (!canvasId) return

    const snapshot = {
      nodes: serializeNodes(nodes),
      edges: serializeEdges(edges),
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      void save(snapshot)
    }, 500)

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    }
  }, [nodes, edges, canvasId, save])
}
