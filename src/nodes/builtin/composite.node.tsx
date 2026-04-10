import { ChevronDown, ChevronRight, Layers3 } from 'lucide-react'
import { useWorkflowStore } from '@/stores/workflow.store'
import { cn } from '@/lib/cn'
import type { FlxNodeDefinition, FlxNodeProps } from '@/types/node'
import type { PortValue } from '@/types/port'

export const definition: FlxNodeDefinition = {
  id: 'composite',
  name: 'Composite',
  category: 'custom',
  family: 'layout',
  description: 'Collapse a related cluster of nodes into a named capability',
  icon: 'Layers3',
  color: '#8b5cf6',
  executable: false,
  paletteHidden: true,
  ports: {
    inputs: [],
    outputs: [],
  },
  defaultConfig: {
    title: 'Composite',
    summary: '',
    collapsed: false,
    childNodeIds: [],
    expandedWidth: 420,
    expandedHeight: 260,
  },
}

function getPreviewLabels(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  return values.filter((value): value is string => typeof value === 'string').slice(0, 3)
}

export function CompositeNode({ id, data, selected }: FlxNodeProps) {
  const toggleCollapse = useWorkflowStore((s) => s.toggleCompositeCollapse)
  const title = String(data.config.title ?? data.label)
  const summary = String(data.config.summary ?? '')
  const childNodeIds = Array.isArray(data.config.childNodeIds) ? data.config.childNodeIds : []
  const collapsed = Boolean(data.config.collapsed)
  const previews = getPreviewLabels(data.config.previewLabels)

  return (
    <div
      data-testid={`node-${id}`}
      data-node-type="composite"
      className={cn(
        'group/node h-full w-full rounded-[22px] border border-violet-300/30 bg-[linear-gradient(160deg,rgba(76,29,149,0.12),rgba(15,23,42,0.04))] shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur',
        selected && 'ring-2 ring-violet-400/70',
        collapsed ? 'overflow-hidden' : 'overflow-visible',
      )}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-start gap-3 border-b border-violet-300/20 px-4 py-3">
          <div className="mt-0.5 rounded-xl bg-violet-500/15 p-2 text-violet-200">
            <Layers3 className="h-4 w-4" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold text-foreground">{title}</span>
              <span className="rounded-full border border-violet-300/20 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-violet-200/80">
                {collapsed ? 'abstracted' : 'open'}
              </span>
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {summary || `${childNodeIds.length} internal node${childNodeIds.length === 1 ? '' : 's'} grouped into one capability`}
            </p>
          </div>

          <button
            className="rounded-lg border border-violet-300/20 bg-card/50 p-1.5 text-muted-foreground transition-colors hover:border-violet-300/40 hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation()
              toggleCollapse(id)
            }}
            title={collapsed ? 'Expand composite' : 'Collapse composite'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>

        <div className="flex-1 px-4 py-3">
          {collapsed ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl border border-white/8 bg-card/70 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Internal</div>
                  <div className="mt-1 text-lg font-semibold text-foreground">{childNodeIds.length}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-card/70 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Mode</div>
                  <div className="mt-1 text-sm font-medium text-foreground">Collapsed</div>
                </div>
              </div>

              {previews.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Preview</div>
                  <div className="flex flex-wrap gap-1.5">
                    {previews.map((preview) => (
                      <span
                        key={preview}
                        className="rounded-full border border-violet-300/20 bg-violet-500/10 px-2.5 py-1 text-[11px] text-violet-100"
                      >
                        {preview}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-violet-300/20 bg-card/40 px-3 py-2 text-xs text-muted-foreground">
                  Collapse keeps the contract visible while hiding the implementation graph.
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full items-end">
              <div className="w-full rounded-2xl border border-dashed border-violet-300/20 bg-card/35 px-3 py-2 text-xs text-muted-foreground">
                Double click children to inspect their config. Collapse when the surrounding detail becomes noise.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const runner = {
  async execute(): Promise<Record<string, PortValue>> {
    return {}
  },
}
