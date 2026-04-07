import { BaseNodeShell } from '../_base/base-node-shell'
import type { FlxNodeDefinition, FlxNodeProps, FlxNodeRunner } from '@/types/node'
import { useWorkflowStore } from '@/stores/workflow.store'
import { useCallback } from 'react'

export const definition: FlxNodeDefinition = {
  id: 'script',
  name: 'Script',
  category: 'transform',
  description: 'Run a PowerShell or Bash script with input substitution',
  icon: 'Terminal',
  color: '#f59e0b',
  ports: {
    inputs: [
      { id: 'arg1', label: 'Arg 1', dataType: 'string', required: false },
      { id: 'arg2', label: 'Arg 2', dataType: 'string', required: false },
      { id: 'arg3', label: 'Arg 3', dataType: 'string', required: false },
      { id: 'arg4', label: 'Arg 4', dataType: 'string', required: false },
    ],
    outputs: [
      { id: 'stdout', label: 'Stdout', dataType: 'string' },
      { id: 'stderr', label: 'Stderr', dataType: 'string' },
      { id: 'exitCode', label: 'Exit Code', dataType: 'number' },
    ],
  },
  defaultConfig: {
    command: '',
    shell: 'powershell',
    cwd: '',
  },
}

export function ScriptNode({ id, data, selected }: FlxNodeProps) {
  const updateConfig = useWorkflowStore((s) => s.updateNodeConfig)

  const onCommandChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateConfig(id, { command: e.target.value })
    },
    [id, updateConfig],
  )

  const onShellChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateConfig(id, { shell: e.target.value })
    },
    [id, updateConfig],
  )

  return (
    <BaseNodeShell id={id} definition={data.definition} label={data.label} selected={selected}>
      <div className="flex flex-col gap-1.5">
        <select
          className="w-full bg-muted rounded px-2 py-0.5 text-[10px] text-foreground outline-none"
          value={String(data.config.shell ?? 'powershell')}
          onChange={onShellChange}
        >
          <option value="powershell">PowerShell</option>
          <option value="bash">Bash</option>
        </select>
        <textarea
          className="w-full bg-muted rounded px-2 py-1 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring font-mono resize-y min-h-[60px]"
          value={String(data.config.command ?? '')}
          onChange={onCommandChange}
          placeholder="Use {{arg1}}, {{arg2}}... for inputs"
          rows={3}
        />
      </div>
    </BaseNodeShell>
  )
}

export const runner: FlxNodeRunner = {
  async execute(inputs, config, context) {
    let command = String(config.command ?? '')

    // Substitute {{argN}} placeholders with input values
    for (const [key, value] of Object.entries(inputs)) {
      command = command.replaceAll(`{{${key}}}`, String(value))
    }

    const result = await context.serverApi.runScript({
      command,
      shell: (config.shell as 'powershell' | 'bash') ?? 'powershell',
      cwd: config.cwd ? String(config.cwd) : undefined,
    })

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    }
  },
}
