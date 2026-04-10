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
import { nanoid } from 'nanoid'
import { getNodeDefinition } from '@/canvas/node-types-registry'

const COMPOSITE_PADDING_X = 28
const COMPOSITE_PADDING_TOP = 84
const COMPOSITE_PADDING_BOTTOM = 28
const COMPOSITE_MIN_WIDTH = 360
const COMPOSITE_MIN_HEIGHT = 220
const COMPOSITE_COLLAPSED_WIDTH = 320
const COMPOSITE_COLLAPSED_HEIGHT = 196

function isCompositeNode(node: Node<FlxNodeData>): boolean {
  return node.data.definition.id === 'composite'
}

function getNodeWidth(node: Node<FlxNodeData>): number {
  if (node.measured?.width) return node.measured.width
  if (typeof node.width === 'number') return node.width
  const styleWidth = node.style && 'width' in node.style ? node.style.width : undefined
  return typeof styleWidth === 'number' ? styleWidth : 220
}

function getNodeHeight(node: Node<FlxNodeData>): number {
  if (node.measured?.height) return node.measured.height
  if (typeof node.height === 'number') return node.height
  const styleHeight = node.style && 'height' in node.style ? node.style.height : undefined
  return typeof styleHeight === 'number' ? styleHeight : 140
}

function liftCompositeChildren(nodes: Node<FlxNodeData>[], compositeId: string): Node<FlxNodeData>[] {
  const composite = nodes.find((node) => node.id === compositeId)
  if (!composite) return nodes

  return nodes.map((node) => {
    if (node.parentId !== compositeId) return node

    return {
      ...node,
      parentId: undefined,
      extent: undefined,
      hidden: false,
      position: {
        x: composite.position.x + node.position.x,
        y: composite.position.y + node.position.y,
      },
    }
  })
}

function refreshCompositePreview(nodes: Node<FlxNodeData>[], compositeId: string): Node<FlxNodeData>[] {
  const composite = nodes.find((node) => node.id === compositeId)
  if (!composite) return nodes

  const childIds = Array.isArray(composite.data.config.childNodeIds)
    ? composite.data.config.childNodeIds.filter((value): value is string => typeof value === 'string')
    : []

  const previewLabels = nodes
    .filter((node) => childIds.includes(node.id))
    .map((node) => node.data.label)
    .slice(0, 3)

  return nodes.map((node) => (
    node.id === compositeId
      ? {
          ...node,
          data: {
            ...node.data,
            config: {
              ...node.data.config,
              previewLabels,
            },
          },
        }
      : node
  ))
}

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
  updateNodeLabel: (nodeId: string, label: string) => void
  addNode: (node: Node<FlxNodeData>) => void
  removeNode: (nodeId: string) => void
  addEdge: (edge: Edge) => void
  removeEdge: (edgeId: string) => void
  groupSelectionAsComposite: () => void
  toggleCompositeCollapse: (nodeId: string) => void
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

  updateNodeLabel: (nodeId, label) =>
    set((s) => ({
      nodes: refreshCompositePreview(
        s.nodes.map((n) => (
          n.id === nodeId
            ? { ...n, data: { ...n.data, label } }
            : n
        )),
        s.nodes.find((node) => node.id === nodeId)?.parentId ?? '',
      ),
    })),

  addNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

  removeNode: (nodeId) =>
    set((s) => {
      const node = s.nodes.find((entry) => entry.id === nodeId)
      if (!node) return s

      const nextNodes = liftCompositeChildren(s.nodes, nodeId).filter((entry) => entry.id !== nodeId)
      const parentCompositeId = node.parentId
      const syncedNodes = parentCompositeId
        ? nextNodes.map((entry) => (
            entry.id === parentCompositeId
              ? {
                  ...entry,
                  data: {
                    ...entry.data,
                    config: {
                      ...entry.data.config,
                      childNodeIds: Array.isArray(entry.data.config.childNodeIds)
                        ? entry.data.config.childNodeIds.filter((value) => value !== nodeId)
                        : [],
                    },
                  },
                }
              : entry
          ))
        : nextNodes

      return {
        nodes: parentCompositeId ? refreshCompositePreview(syncedNodes, parentCompositeId) : syncedNodes,
        edges: s.edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
      }
    }),

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

  removeEdge: (edgeId) =>
    set((s) => ({ edges: s.edges.filter((e) => e.id !== edgeId) })),

  groupSelectionAsComposite: () =>
    set((s) => {
      const selectedNodes = s.nodes.filter((node) => node.selected)
      if (
        selectedNodes.length < 2 ||
        selectedNodes.some((node) => node.parentId || isCompositeNode(node))
      ) {
        return s
      }

      const definition = getNodeDefinition('composite')
      if (!definition) return s

      const minX = Math.min(...selectedNodes.map((node) => node.position.x))
      const minY = Math.min(...selectedNodes.map((node) => node.position.y))
      const maxX = Math.max(...selectedNodes.map((node) => node.position.x + getNodeWidth(node)))
      const maxY = Math.max(...selectedNodes.map((node) => node.position.y + getNodeHeight(node)))

      const compositeId = nanoid()
      const compositeX = minX - COMPOSITE_PADDING_X
      const compositeY = minY - COMPOSITE_PADDING_TOP
      const expandedWidth = Math.max(COMPOSITE_MIN_WIDTH, maxX - minX + COMPOSITE_PADDING_X * 2)
      const expandedHeight = Math.max(
        COMPOSITE_MIN_HEIGHT,
        maxY - minY + COMPOSITE_PADDING_TOP + COMPOSITE_PADDING_BOTTOM,
      )
      const previewLabels = selectedNodes.map((node) => node.data.label).slice(0, 3)

      const compositeNode: Node<FlxNodeData> = {
        id: compositeId,
        type: definition.id,
        position: { x: compositeX, y: compositeY },
        selected: true,
        style: {
          width: expandedWidth,
          height: expandedHeight,
        },
        data: {
          definition,
          workflowId: selectedNodes[0]?.data.workflowId ?? 'default',
          label: 'Composite',
          config: {
            ...(definition.defaultConfig ?? {}),
            title: 'Composite',
            summary: '',
            collapsed: false,
            childNodeIds: selectedNodes.map((node) => node.id),
            previewLabels,
            expandedWidth,
            expandedHeight,
          },
        },
      }

      return {
        nodes: [
          ...s.nodes.map((node) => {
            if (!node.selected) return node

            return {
              ...node,
              selected: false,
              parentId: compositeId,
              extent: 'parent' as const,
              hidden: false,
              position: {
                x: node.position.x - compositeX,
                y: node.position.y - compositeY,
              },
            }
          }),
          compositeNode,
        ],
      }
    }),

  toggleCompositeCollapse: (nodeId) =>
    set((s) => {
      const composite = s.nodes.find((node) => node.id === nodeId && isCompositeNode(node))
      if (!composite) return s

      const currentCollapsed = Boolean(composite.data.config.collapsed)
      const expandedWidth = Number(composite.data.config.expandedWidth ?? composite.style?.width ?? COMPOSITE_MIN_WIDTH)
      const expandedHeight = Number(composite.data.config.expandedHeight ?? composite.style?.height ?? COMPOSITE_MIN_HEIGHT)
      const nextCollapsed = !currentCollapsed

      return {
        nodes: s.nodes.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              style: {
                ...node.style,
                width: nextCollapsed ? COMPOSITE_COLLAPSED_WIDTH : expandedWidth,
                height: nextCollapsed ? COMPOSITE_COLLAPSED_HEIGHT : expandedHeight,
              },
              data: {
                ...node.data,
                config: {
                  ...node.data.config,
                  collapsed: nextCollapsed,
                  expandedWidth,
                  expandedHeight,
                },
              },
            }
          }

          if (node.parentId === nodeId) {
            return {
              ...node,
              hidden: nextCollapsed,
              selected: false,
            }
          }

          return node
        }),
      }
    }),

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),

  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
}))

export const useWorkflowNodes = () => useWorkflowStore((s) => s.nodes)
export const useWorkflowEdges = () => useWorkflowStore((s) => s.edges)
