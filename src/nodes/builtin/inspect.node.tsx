import { BaseNodeShell } from '../_base/base-node-shell'
import type { FlxNodeDefinition, FlxNodeProps, FlxNodeRunner } from '@/types/node'
import { useNodeExecutionState } from '@/stores/execution.store'

export const definition: FlxNodeDefinition = {
  id: 'inspect',
  name: 'Inspect',
  category: 'output',
  family: 'debug',
  description: 'Display a value inline without changing it',
  icon: 'Eye',
  color: '#06b6d4',
  aliases: ['output-display'],
  ports: {
    inputs: [{ id: 'value', label: 'Value', dataType: 'string', required: false, multi: true }],
    outputs: [{ id: 'value', label: 'Value', dataType: 'string' }],
  },
  defaultConfig: {},
}

export function InspectNode({ id, data, selected }: FlxNodeProps) {
  const { output, error } = useNodeExecutionState(id)
  const displayValue = output?.value ?? data.lastOutputs?.value ?? null

  return (
    <BaseNodeShell id={id} definition={data.definition} label={data.label} selected={selected}>
      <div className="text-xs font-mono max-h-[120px] overflow-auto">
        {error ? (
          <span className="text-red-400">{error}</span>
        ) : displayValue !== null ? (
          <pre className="whitespace-pre-wrap text-muted-foreground">{String(displayValue)}</pre>
        ) : (
          <span className="text-muted-foreground/50 italic">Awaiting input</span>
        )}
      </div>
    </BaseNodeShell>
  )
}

export const runner: FlxNodeRunner = {
  async execute(inputs) {
    return { value: inputs.value ?? '' }
  },
}
