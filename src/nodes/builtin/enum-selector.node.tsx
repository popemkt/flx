import { BaseNodeShell } from '../_base/base-node-shell'
import type { FlxNodeDefinition, FlxNodeProps, FlxNodeRunner } from '@/types/node'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCallback } from 'react'

export const definition: FlxNodeDefinition = {
  id: 'enum-selector',
  name: 'Enum Selector',
  category: 'input',
  description: 'Select from predefined or dynamic options (pipe command output to the options input)',
  icon: 'List',
  color: '#a855f7',
  ports: {
    inputs: [
      { id: 'options', label: 'Options', dataType: 'string', required: false, description: 'Newline or comma-separated list of options (from script output)' },
    ],
    outputs: [{ id: 'value', label: 'Value', dataType: 'enum' }],
  },
  defaultConfig: { selected: '', options: 'option1, option2' },
}

export function EnumSelectorNode({ id, data, selected }: FlxNodeProps) {
  const updateConfig = useWorkflowStore((s) => s.updateNodeConfig)
  const optionsStr = String(data.config.options ?? '')
  const options = optionsStr.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateConfig(id, { selected: e.target.value })
    },
    [id, updateConfig],
  )

  const onOptionsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateConfig(id, { options: e.target.value })
    },
    [id, updateConfig],
  )

  return (
    <BaseNodeShell id={id} definition={data.definition} label={data.label} selected={selected}>
      <div className="flex flex-col gap-1.5">
        <select
          className="w-full bg-muted rounded px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
          value={String(data.config.selected ?? '')}
          onChange={onChange}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <input
          className="w-full bg-muted rounded px-2 py-0.5 text-[10px] text-muted-foreground outline-none"
          value={optionsStr}
          onChange={onOptionsChange}
          placeholder="Comma-separated options"
        />
      </div>
    </BaseNodeShell>
  )
}

export const runner: FlxNodeRunner = {
  async execute(inputs, config) {
    // If dynamic options are piped in, use them instead of static config
    let options: string[]
    if (inputs.options) {
      const raw = String(inputs.options).trim()
      options = raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
    } else {
      options = String(config.options ?? '').split(/[,\n]/).map((s) => s.trim()).filter(Boolean)
    }

    // Use the configured selection, or fall back to first option
    const selected = String(config.selected ?? '')
    const value = selected && options.includes(selected) ? selected : (options[0] ?? '')

    return { value }
  },
}
