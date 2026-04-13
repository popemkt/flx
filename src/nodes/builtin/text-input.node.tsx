import { BaseNodeShell } from '../_base/base-node-shell'
import type { FlxNodeDefinition, FlxNodeProps, FlxNodeRunner } from '@/types/node'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCallback } from 'react'

export const definition: FlxNodeDefinition = {
  id: 'text-input',
  name: 'Constant (Text)',
  category: 'input',
  family: 'source',
  description: 'Provide a static string value',
  icon: 'Type',
  color: '#22c55e',
  ports: {
    inputs: [],
    outputs: [{ id: 'value', label: 'Value', dataType: 'string' }],
  },
  defaultConfig: { value: '' },
  paletteHidden: false,
}

export function TextInputNode({ id, data, selected }: FlxNodeProps) {
  const updateConfig = useWorkflowStore((s) => s.updateNodeConfig)

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateConfig(id, { value: e.target.value })
    },
    [id, updateConfig],
  )

  return (
    <BaseNodeShell id={id} definition={data.definition} label={data.label} selected={selected}>
      <input
        className="w-full bg-muted rounded px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
        value={String(data.config.value ?? '')}
        onChange={onChange}
        placeholder="Enter text..."
      />
    </BaseNodeShell>
  )
}

export const runner: FlxNodeRunner = {
  async execute(_inputs, config) {
    return { value: String(config.value ?? '') }
  },
}
