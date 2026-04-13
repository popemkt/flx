import { useCanvasStore } from '@/stores/canvas.store'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useNodeExecutionState } from '@/stores/execution.store'
import { X } from 'lucide-react'
import { useCallback } from 'react'
import type { FlxNodeData } from '@/types/node'
import type { Node } from '@xyflow/react'

function ConfigField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}

function NodeConfigForm({ node }: { node: Node<FlxNodeData> }) {
  const updateConfig = useWorkflowStore((s) => s.updateNodeConfig)
  const updateNodeLabel = useWorkflowStore((s) => s.updateNodeLabel)
  const toggleCompositeCollapse = useWorkflowStore((s) => s.toggleCompositeCollapse)
  const { definition, config } = node.data
  const { status, output, error } = useNodeExecutionState(node.id)

  const setConfig = useCallback(
    (key: string, value: unknown) => updateConfig(node.id, { [key]: value }),
    [node.id, updateConfig],
  )
  const setNodeLabel = useCallback(
    (label: string) => {
      updateNodeLabel(node.id, label)
      if (definition.id === 'composite') {
        updateConfig(node.id, { title: label })
      }
    },
    [definition.id, node.id, updateConfig, updateNodeLabel],
  )

  return (
    <div className="flex flex-col gap-3">
      <ConfigField label={definition.id === 'composite' ? 'Composite Name' : 'Node Name'}>
        <input
          className="w-full bg-muted rounded px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
          value={node.data.label}
          onChange={(e) => setNodeLabel(e.target.value)}
          placeholder="Give this node a clear purpose"
        />
      </ConfigField>

      {/* Node type-specific config */}
      {definition.id === 'text-input' && (
        <ConfigField label="Value">
          <input
            className="w-full bg-muted rounded px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            value={String(config.value ?? '')}
            onChange={(e) => setConfig('value', e.target.value)}
            placeholder="Enter text..."
          />
        </ConfigField>
      )}

      {definition.id === 'number-input' && (
        <ConfigField label="Value">
          <input
            type="number"
            className="w-full bg-muted rounded px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
            value={String(config.value ?? '')}
            onChange={(e) => setConfig('value', e.target.value)}
            placeholder="Enter number..."
          />
        </ConfigField>
      )}

      {definition.id === 'enum-selector' && (
        <>
          <ConfigField label="Static Options (comma or newline separated)">
            <textarea
              className="w-full bg-muted rounded px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring resize-y min-h-[40px]"
              value={String(config.options ?? '')}
              onChange={(e) => setConfig('options', e.target.value)}
              placeholder="option1, option2, option3"
              rows={2}
            />
          </ConfigField>
          <div className="text-[10px] text-muted-foreground -mt-2">
            Pipe a script's stdout to the Options input port for dynamic options.
          </div>
          <ConfigField label="Selected">
            <select
              className="w-full bg-muted rounded px-2 py-1.5 text-xs text-foreground outline-none"
              value={String(config.selected ?? '')}
              onChange={(e) => setConfig('selected', e.target.value)}
            >
              <option value="">Select...</option>
              {String(config.options ?? '')
                .split(/[,\n]/)
                .map((o) => o.trim())
                .filter(Boolean)
                .map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
            </select>
          </ConfigField>
        </>
      )}

      {(definition.id === 'script' || definition.id === 'command') && (
        <>
          <ConfigField label="Shell">
            <select
              className="w-full bg-muted rounded px-2 py-1.5 text-xs text-foreground outline-none"
              value={String(config.shell ?? 'powershell')}
              onChange={(e) => setConfig('shell', e.target.value)}
            >
              <option value="powershell">PowerShell</option>
              <option value="bash">Bash</option>
            </select>
          </ConfigField>
          <ConfigField label="Command">
            <textarea
              className="w-full bg-muted rounded px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring font-mono resize-y min-h-[100px]"
              value={String(config.command ?? '')}
              onChange={(e) => setConfig('command', e.target.value)}
              placeholder={'Use {{arg1}}, {{arg2}}... for inputs'}
              rows={5}
            />
          </ConfigField>
          <ConfigField label="Working Directory">
            <input
              className="w-full bg-muted rounded px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring font-mono"
              value={String(config.cwd ?? '')}
              onChange={(e) => setConfig('cwd', e.target.value)}
              placeholder="(default: server cwd)"
            />
          </ConfigField>
        </>
      )}

      {definition.id === 'template' && (
        <ConfigField label="Template">
          <textarea
            className="w-full bg-muted rounded px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring font-mono resize-y min-h-[100px]"
            value={String(config.template ?? '{{value}}')}
            onChange={(e) => setConfig('template', e.target.value)}
            placeholder="Use {{value}} or any connected input key"
            rows={5}
          />
        </ConfigField>
      )}

      {(definition.id === 'output-display' || definition.id === 'inspect') && (
        <div className="text-xs text-muted-foreground italic">
          No execution configuration needed. This node surfaces a value inline and keeps it flowing.
        </div>
      )}

      {definition.id === 'composite' && (
        <>
          <ConfigField label="Summary">
            <textarea
              className="w-full bg-muted rounded px-2 py-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring resize-y min-h-[72px]"
              value={String(config.summary ?? '')}
              onChange={(e) => setConfig('summary', e.target.value)}
              placeholder="What capability does this abstracted group provide?"
              rows={4}
            />
          </ConfigField>

          <ConfigField label="Presentation">
            <button
              type="button"
              onClick={() => toggleCompositeCollapse(node.id)}
              className="flex w-full items-center justify-between rounded bg-muted px-2 py-2 text-xs text-foreground transition-colors hover:bg-muted/80"
            >
              <span>{config.collapsed ? 'Collapsed' : 'Expanded'}</span>
              <span className="text-muted-foreground">
                {config.collapsed ? 'Expand' : 'Collapse'}
              </span>
            </button>
          </ConfigField>

          <div className="rounded-lg border bg-muted/40 px-3 py-2">
            <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Boundary
            </div>
            <div className="mt-2 text-xs text-foreground">
              {Array.isArray(config.childNodeIds) ? config.childNodeIds.length : 0} internal node{Array.isArray(config.childNodeIds) && config.childNodeIds.length === 1 ? '' : 's'}
            </div>
            {Array.isArray(config.previewLabels) && config.previewLabels.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {config.previewLabels
                  .filter((value): value is string => typeof value === 'string')
                  .map((value) => (
                    <span
                      key={value}
                      className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground"
                    >
                      {value}
                    </span>
                  ))}
              </div>
            ) : null}
          </div>
        </>
      )}

      {/* Ports info */}
      {(definition.ports.inputs.length > 0 || definition.ports.outputs.length > 0) && (
        <div className="border-t pt-3 mt-1">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Ports
          </div>
          {definition.ports.inputs.length > 0 && (
            <div className="mb-2">
              <div className="text-[10px] text-muted-foreground mb-1">Inputs</div>
              {definition.ports.inputs.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-xs py-0.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: `var(--color-port-${p.dataType})` }}
                  />
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="text-muted-foreground/50 text-[10px]">({p.dataType})</span>
                </div>
              ))}
            </div>
          )}
          {definition.ports.outputs.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground mb-1">Outputs</div>
              {definition.ports.outputs.map((p) => (
                <div key={p.id} className="flex items-center gap-1.5 text-xs py-0.5">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: `var(--color-port-${p.dataType})` }}
                  />
                  <span className="text-muted-foreground">{p.label}</span>
                  <span className="text-muted-foreground/50 text-[10px]">({p.dataType})</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Last execution output */}
      {(status === 'success' || status === 'error') && (
        <div className="border-t pt-3 mt-1">
          <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Last Execution
          </div>
          {error && <div className="text-xs text-red-400 font-mono">{error}</div>}
          {output && (
            <pre className="text-[10px] font-mono text-muted-foreground bg-muted rounded p-2 overflow-auto max-h-[200px] whitespace-pre-wrap">
              {JSON.stringify(output, null, 2)}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

export function NodeConfigSidebar() {
  const selectedNodeId = useCanvasStore((s) => s.selectedNodeForConfig)
  const close = useCanvasStore((s) => s.setSelectedNodeForConfig)
  const nodes = useWorkflowStore((s) => s.nodes)

  const node = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null

  if (!node) return null

  return (
    <div className="w-[300px] border-l bg-card flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 border-b shrink-0"
        style={{ borderLeftColor: node.data.definition.color ?? '#6b7280', borderLeftWidth: 3 }}
      >
        <span className="text-sm font-medium truncate flex-1">{node.data.label}</span>
        <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
          {node.data.definition.name}
        </span>
        <button
          onClick={() => close(null)}
          className="p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Config form */}
      <div className="flex-1 overflow-y-auto p-3">
        <NodeConfigForm node={node} />
      </div>
    </div>
  )
}
