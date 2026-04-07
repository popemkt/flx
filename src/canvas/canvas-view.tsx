import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
  useReactFlow,
  type Connection,
  type OnConnect,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { useWorkflowStore } from '@/stores/workflow.store'
import { useCanvasStore } from '@/stores/canvas.store'
import type { NodeMouseHandler } from '@xyflow/react'
import { getReactFlowNodeTypes, getReactFlowEdgeTypes } from './node-types-registry'
import { isValidConnection } from './edge-validators'
import { useCanvasContextMenu, CanvasContextMenu } from './context-menu'

function CanvasInner() {
  const nodes = useWorkflowStore((s) => s.nodes)
  const edges = useWorkflowStore((s) => s.edges)
  const onNodesChange = useWorkflowStore((s) => s.onNodesChange)
  const onEdgesChange = useWorkflowStore((s) => s.onEdgesChange)
  const setEdges = useWorkflowStore((s) => s.setEdges)
  const snapToGrid = useCanvasStore((s) => s.snapToGrid)
  const gridSize = useCanvasStore((s) => s.gridSize)

  const { screenToFlowPosition } = useReactFlow()
  const { menu, onContextMenu, close: closeMenu } = useCanvasContextMenu()
  const setSelectedNodeForConfig = useCanvasStore((s) => s.setSelectedNodeForConfig)

  const onNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      setSelectedNodeForConfig(node.id)
    },
    [setSelectedNodeForConfig],
  )

  const nodeTypes = useMemo(() => getReactFlowNodeTypes(), [])
  const edgeTypes = useMemo(() => getReactFlowEdgeTypes(), [])

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      setEdges(addEdge(connection, edges))
    },
    [edges, setEdges],
  )

  return (
    <div className="w-full h-full" onContextMenu={onContextMenu}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        snapToGrid={snapToGrid}
        snapGrid={[gridSize, gridSize]}
        fitView
        deleteKeyCode={['Delete', 'Backspace']}
        className="bg-background"
        onPaneClick={() => { closeMenu(); setSelectedNodeForConfig(null) }}
      >
        <Background variant={BackgroundVariant.Dots} gap={gridSize} size={1} color="#333" />
        <Controls className="!bg-card !border-border !shadow-md [&_button]:!bg-card [&_button]:!border-border [&_button]:!text-foreground" />
        <MiniMap
          className="!bg-card !border-border"
          nodeColor="#3b82f6"
          maskColor="rgba(0, 0, 0, 0.7)"
        />
      </ReactFlow>

      {menu && (
        <CanvasContextMenu
          x={menu.x}
          y={menu.y}
          canvasX={menu.canvasX}
          canvasY={menu.canvasY}
          onClose={closeMenu}
          screenToFlowPosition={screenToFlowPosition}
        />
      )}
    </div>
  )
}

export function CanvasView() {
  return <CanvasInner />
}
