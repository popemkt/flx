import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CanvasState {
  activeCanvasId: string | null
  viewport: { x: number; y: number; zoom: number }
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  snapToGrid: boolean
  gridSize: number
}

interface CanvasActions {
  setActiveCanvas: (id: string) => void
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void
  selectNodes: (ids: string[]) => void
  selectEdges: (ids: string[]) => void
  clearSelection: () => void
  toggleSnapToGrid: () => void
  setGridSize: (size: number) => void
}

export type CanvasStore = CanvasState & CanvasActions

export const useCanvasStore = create<CanvasStore>()(
  persist(
    (set) => ({
      activeCanvasId: null,
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeIds: [],
      selectedEdgeIds: [],
      snapToGrid: true,
      gridSize: 20,

      setActiveCanvas: (id) => set({ activeCanvasId: id }),
      setViewport: (viewport) => set({ viewport }),
      selectNodes: (ids) => set({ selectedNodeIds: ids, selectedEdgeIds: [] }),
      selectEdges: (ids) => set({ selectedEdgeIds: ids, selectedNodeIds: [] }),
      clearSelection: () => set({ selectedNodeIds: [], selectedEdgeIds: [] }),
      toggleSnapToGrid: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
      setGridSize: (size) => set({ gridSize: size }),
    }),
    {
      name: 'flx-canvas',
      version: 1,
      partialize: (state) => ({
        snapToGrid: state.snapToGrid,
        gridSize: state.gridSize,
      }),
    },
  ),
)

export const useActiveCanvasId = () => useCanvasStore((s) => s.activeCanvasId)
export const useSnapToGrid = () => useCanvasStore((s) => s.snapToGrid)
export const useGridSize = () => useCanvasStore((s) => s.gridSize)
