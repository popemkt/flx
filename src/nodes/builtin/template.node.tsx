import { BaseNodeShell } from '../_base/base-node-shell'
import type { FlxNodeDefinition, FlxNodeProps, FlxNodeRunner } from '@/types/node'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCallback } from 'react'

export const definition: FlxNodeDefinition = {
  id: 'template',
  name: 'Template',
  category: 'transform',
  family: 'data',
  description: 'Interpolate a string template from piped values',
  icon: 'Type',
  color: '#14b8a6',
  ports: {
    inputs: [
      { id: 'value', label: 'Value', dataType: 'string', required: false, multi: true },
    ],
    outputs: [
      { id: 'text', label: 'Text', dataType: 'string' },
    ],
  },
  defaultConfig: {
    template: '{{value}}',
  },
}

export function TemplateNode({ id, data, selected }: FlxNodeProps) {
  const updateConfig = useWorkflowStore((s) => s.updateNodeConfig)

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateConfig(id, { template: e.target.value })
    },
    [id, updateConfig],
  )

  return (
    <BaseNodeShell id={id} definition={data.definition} label={data.label} selected={selected}>
      <textarea
        className="w-full bg-muted rounded px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring font-mono resize-y min-h-[72px]"
        value={String(data.config.template ?? '{{value}}')}
        onChange={onChange}
        placeholder="Template text with {{value}}"
        rows={4}
      />
    </BaseNodeShell>
  )
}

export const runner: FlxNodeRunner = {
  async execute(inputs, config) {
    let text = String(config.template ?? '{{value}}')

    for (const [key, value] of Object.entries(inputs)) {
      text = text.replaceAll(`{{${key}}}`, String(value))
    }

    return { text }
  },
}
