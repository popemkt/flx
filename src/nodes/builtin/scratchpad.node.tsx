import { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { BaseNodeShell } from '../_base/base-node-shell'
import type { FlxNodeDefinition, FlxNodeProps, FlxNodeRunner } from '@/types/node'
import { useNodeExecutionState } from '@/stores/execution.store'
import { useWorkflowStore } from '@/stores/workflow.store'
import { X } from 'lucide-react'

export const definition: FlxNodeDefinition = {
  id: 'scratchpad',
  name: 'Scratchpad',
  category: 'output',
  family: 'debug',
  description: 'Monaco editor scratchpad — each execution creates a new tab with piped input',
  icon: 'NotebookPen',
  color: '#f59e0b',
  ports: {
    inputs: [
      { id: 'content', label: 'Content', dataType: 'string', required: false, multi: true },
    ],
    outputs: [],
  },
  defaultConfig: { tabs: [], activeTab: 0 },
}

interface Tab {
  id: string
  label: string
  content: string
}

export function ScratchpadNode({ id, data, selected }: FlxNodeProps) {
  const { output } = useNodeExecutionState(id)
  const updateConfig = useWorkflowStore((s) => s.updateNodeConfig)

  const tabs: Tab[] = (data.config.tabs as Tab[]) ?? []
  const [activeTab, setActiveTab] = useState<number>((data.config.activeTab as number) ?? 0)

  // When a new execution result arrives, it will have been appended by the runner
  // and persisted via config update from the execution hook.
  // Check if the runner just produced a new tab via output
  const pendingContent = output?.content as string | undefined
  if (pendingContent !== undefined && tabs.length > 0) {
    // The runner signals the latest tab index
    const latestIdx = tabs.length - 1
    if (activeTab !== latestIdx) {
      setActiveTab(latestIdx)
    }
  }

  const onTabChange = useCallback(
    (content: string | undefined) => {
      if (content === undefined || !tabs[activeTab]) return
      const updated = tabs.map((t, i) => (i === activeTab ? { ...t, content } : t))
      updateConfig(id, { tabs: updated, activeTab })
    },
    [id, tabs, activeTab, updateConfig],
  )

  const closeTab = useCallback(
    (idx: number, e: React.MouseEvent) => {
      e.stopPropagation()
      const updated = tabs.filter((_, i) => i !== idx)
      const newActive = Math.min(activeTab, Math.max(0, updated.length - 1))
      setActiveTab(newActive)
      updateConfig(id, { tabs: updated, activeTab: newActive })
    },
    [id, tabs, activeTab, updateConfig],
  )

  const currentTab = tabs[activeTab]

  return (
    <BaseNodeShell id={id} definition={data.definition} label={data.label} selected={selected} className="max-w-none w-[320px]">
      <div className="flex flex-col">
        {/* Tab bar */}
        {tabs.length > 0 && (
          <div className="flex gap-0 border-b border-border overflow-x-auto">
            {tabs.map((tab, i) => (
              <button
                key={tab.id}
                className={`flex items-center gap-1 px-2 py-1 text-[10px] border-r border-border shrink-0 ${
                  i === activeTab
                    ? 'bg-card text-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
                onClick={(e) => { e.stopPropagation(); setActiveTab(i) }}
              >
                <span className="truncate max-w-[80px]">{tab.label}</span>
                <span
                  className="hover:text-red-400 opacity-50 hover:opacity-100"
                  onClick={(e) => closeTab(i, e)}
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Editor */}
        {currentTab ? (
          <div className="h-[150px] nodrag nowheel">
            <Editor
              height="150px"
              defaultLanguage="plaintext"
              theme="vs-dark"
              value={currentTab.content}
              onChange={onTabChange}
              options={{
                minimap: { enabled: false },
                fontSize: 11,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                padding: { top: 4 },
                overviewRulerLanes: 0,
              }}
            />
          </div>
        ) : (
          <div className="h-[60px] flex items-center justify-center text-muted-foreground/50 text-xs italic">
            Run workflow to populate tabs
          </div>
        )}
      </div>
    </BaseNodeShell>
  )
}

export const runner: FlxNodeRunner = {
  async execute(inputs, config) {
    const existingTabs: Tab[] = (config.tabs as Tab[]) ?? []
    const content = inputs.content != null ? String(inputs.content) : ''
    const tabNum = existingTabs.length + 1
    const newTab: Tab = {
      id: `run-${tabNum}-${Date.now()}`,
      label: `Run ${tabNum}`,
      content,
    }
    const updatedTabs = [...existingTabs, newTab]

    return {
      content,
      __configPatch: { tabs: updatedTabs, activeTab: updatedTabs.length - 1 },
    }
  },
}
