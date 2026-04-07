import { create } from 'zustand'

export interface TerminalTab {
  sessionId: string
  title: string
  status: 'running' | 'exited'
  exitCode?: number
}

interface TerminalState {
  isOpen: boolean
  height: number // panel height in pixels
  tabs: TerminalTab[]
  activeTabId: string | null
}

interface TerminalActions {
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  setHeight: (height: number) => void
  addTab: (tab: TerminalTab) => void
  removeTab: (sessionId: string) => void
  setActiveTab: (sessionId: string) => void
  updateTabStatus: (sessionId: string, status: 'running' | 'exited', exitCode?: number) => void
}

const MIN_HEIGHT = 120
const DEFAULT_HEIGHT = 250
const MAX_HEIGHT_RATIO = 0.6

export const useTerminalStore = create<TerminalState & TerminalActions>((set) => ({
  isOpen: false,
  height: DEFAULT_HEIGHT,
  tabs: [],
  activeTabId: null,

  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),

  setHeight: (height) =>
    set({
      height: Math.max(MIN_HEIGHT, Math.min(height, window.innerHeight * MAX_HEIGHT_RATIO)),
    }),

  addTab: (tab) =>
    set((s) => ({
      tabs: [...s.tabs, tab],
      activeTabId: tab.sessionId,
      isOpen: true,
    })),

  removeTab: (sessionId) =>
    set((s) => {
      const tabs = s.tabs.filter((t) => t.sessionId !== sessionId)
      const activeTabId =
        s.activeTabId === sessionId
          ? tabs[tabs.length - 1]?.sessionId ?? null
          : s.activeTabId
      return { tabs, activeTabId }
    }),

  setActiveTab: (sessionId) => set({ activeTabId: sessionId }),

  updateTabStatus: (sessionId, status, exitCode) =>
    set((s) => ({
      tabs: s.tabs.map((t) =>
        t.sessionId === sessionId ? { ...t, status, exitCode } : t,
      ),
    })),
}))
