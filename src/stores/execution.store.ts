import { create } from 'zustand'

interface NodeExecutionState {
  status: 'idle' | 'running' | 'success' | 'error'
  output?: Record<string, unknown>
  error?: string
  startedAt?: number
  completedAt?: number
}

interface ExecutionState {
  activeExecutionId: string | null
  nodeStates: Record<string, NodeExecutionState>
  status: 'idle' | 'running' | 'success' | 'error' | 'cancelled'
}

interface ExecutionActions {
  startExecution: (executionId: string, nodeIds: string[]) => void
  setNodeRunning: (nodeId: string) => void
  setNodeComplete: (nodeId: string, output: Record<string, unknown>) => void
  setNodeError: (nodeId: string, error: string) => void
  completeExecution: (status: 'success' | 'error' | 'cancelled') => void
  reset: () => void
}

export const useExecutionStore = create<ExecutionState & ExecutionActions>((set) => ({
  activeExecutionId: null,
  nodeStates: {},
  status: 'idle',

  startExecution: (executionId, nodeIds) => {
    const nodeStates: Record<string, NodeExecutionState> = {}
    for (const id of nodeIds) {
      nodeStates[id] = { status: 'idle' }
    }
    set({ activeExecutionId: executionId, nodeStates, status: 'running' })
  },

  setNodeRunning: (nodeId) =>
    set((s) => ({
      nodeStates: {
        ...s.nodeStates,
        [nodeId]: { status: 'running', startedAt: Date.now() },
      },
    })),

  setNodeComplete: (nodeId, output) =>
    set((s) => ({
      nodeStates: {
        ...s.nodeStates,
        [nodeId]: {
          status: 'success',
          output,
          startedAt: s.nodeStates[nodeId]?.startedAt,
          completedAt: Date.now(),
        },
      },
    })),

  setNodeError: (nodeId, error) =>
    set((s) => ({
      nodeStates: {
        ...s.nodeStates,
        [nodeId]: {
          status: 'error',
          error,
          startedAt: s.nodeStates[nodeId]?.startedAt,
          completedAt: Date.now(),
        },
      },
    })),

  completeExecution: (status) =>
    set({ status, activeExecutionId: null }),

  reset: () =>
    set({ activeExecutionId: null, nodeStates: {}, status: 'idle' }),
}))

const IDLE_STATE: NodeExecutionState = { status: 'idle' }

export const useNodeExecutionState = (nodeId: string) =>
  useExecutionStore((s) => s.nodeStates[nodeId] ?? IDLE_STATE)
