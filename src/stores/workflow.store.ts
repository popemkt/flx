import { create } from 'zustand'
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react'
import type { FlxNodeData } from '@/types/node'

interface WorkflowState {
  nodes: Node<FlxNodeData>[]
  edges: Edge[]
  workflows: Array<{ id: string; name: string; color?: string }>
}

interface WorkflowActions {
  setNodes: (nodes: Node<FlxNodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  setWorkflows: (workflows: WorkflowState['workflows']) => void
  updateNodePosition: (nodeId: string, x: number, y: number) => void
  updateNodeConfig: (nodeId: string, config: Record<string, unknown>) => void
  addNode: (node: Node<FlxNodeData>) => void
  removeNode: (nodeId: string) => void
  addEdge: (edge: Edge) => void
  removeEdge: (edgeId: string) => void
  onNodesChange: (changes: NodeChange<Node<FlxNodeData>>[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
}

export type WorkflowStore = WorkflowState & WorkflowActions

export const useWorkflowStore = create<WorkflowStore>((set) => ({
  nodes: [],
  edges: [],
  workflows: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setWorkflows: (workflows) => set({ workflows }),

  updateNodePosition: (nodeId, x, y) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId ? { ...n, position: { x, y } } : n,
      ),
    })),

  updateNodeConfig: (nodeId, config) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } }
          : n,
      ),
    })),

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

  removeNode: (nodeId) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== nodeId),
      edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    })),

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

  removeEdge: (edgeId) =>
    set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) })),

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
}))

export const useWorkflowNodes = () => useWorkflowStore((s) => s.nodes)
export const useWorkflowEdges = () => useWorkflowStore((s) => s.edges)
