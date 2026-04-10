import { BaseNodeShell } from '../_base/base-node-shell'
import type { FlxNodeDefinition, FlxNodeProps, FlxNodeRunner } from '@/types/node'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCallback } from 'react'

export const definition: FlxNodeDefinition = {
  id: 'number-input',
  name: 'Constant (Number)',
  category: 'input',
  family: 'source',
  description: 'Provide a static numeric value',
  icon: 'Hash',
  color: '#3b82f6',
  ports: {
    inputs: [],
    outputs: [{ id: 'value', label: 'Value', dataType: 'number' }],
  },
  defaultConfig: { value: 0 },
}

export function NumberInputNode({ id, data, selected }: FlxNodeProps) {
  const updateConfig = useWorkflowStore((s) => s.updateNodeConfig)

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateConfig(id, { value: parseFloat(e.target.value) || 0 })
    },
    [id, updateConfig],
  )

  return (
    <BaseNodeShell id={id} definition={data.definition} label={data.label} selected={selected}>
      <input
        type="number"
        className="w-full bg-muted rounded px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"
        value={Number(data.config.value ?? 0)}
        onChange={onChange}
        placeholder="0"
      />
    </BaseNodeShell>
  )
}

export const runner: FlxNodeRunner = {
  async execute(_inputs, config) {
    return { value: Number(config.value ?? 0) }
  },
}
