import { BaseNodeShell } from '../_base/base-node-shell'
import type { FlxNodeDefinition, FlxNodeProps, FlxNodeRunner } from '@/types/node'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCallback } from 'react'

export const definition: FlxNodeDefinition = {
  id: 'enum-selector',
  name: 'Enum Selector',
  category: 'input',
  description: 'Select from predefined options',
  icon: 'List',
  color: '#a855f7',
  ports: {
    inputs: [],
    outputs: [{ id: 'value', label: 'Value', dataType: 'enum' }],
  },
  defaultConfig: { value: '', options: ['option1', 'option2'] },
}

export function EnumSelectorNode({ id, data, selected }: FlxNodeProps) {
  const updateConfig = useWorkflowStore((s) => s.updateNodeConfig)
  const options = (data.config.options as string[]) ?? []

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateConfig(id, { value: e.target.value })
    },
    [id, updateConfig],
  )

  const onOptionsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const opts = e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
      updateConfig(id, { options: opts })
    },
    [id, updateConfig],
  )

  return (
    <BaseNodeShell id={id} definition={data.definition} label={data.label} selected={selected}>
      <div className="flex flex-col gap-1.5">
        <select
          className="w-full bg-muted rounded px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
          value={String(data.config.value ?? '')}
          onChange={onChange}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <input
          className="w-full bg-muted rounded px-2 py-0.5 text-[10px] text-muted-foreground outline-none"
          value={options.join(', ')}
          onChange={onOptionsChange}
          placeholder="Comma-separated options"
        />
      </div>
    </BaseNodeShell>
  )
}

export const runner: FlxNodeRunner = {
  async execute(_inputs, config) {
    return { value: String(config.value ?? '') }
  },
}
