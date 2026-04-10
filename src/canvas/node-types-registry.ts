import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import type { FlxNodeDefinition, FlxNodeFamily, FlxNodeRunner, NodeTypeEntry } from '@/types/node'

import * as textInput from '@/nodes/builtin/text-input.node'
import * as numberInput from '@/nodes/builtin/number-input.node'
import * as enumSelector from '@/nodes/builtin/enum-selector.node'
import * as templateNode from '@/nodes/builtin/template.node'
import * as commandNode from '@/nodes/builtin/command.node'
import * as inspectNode from '@/nodes/builtin/inspect.node'
import * as scriptNode from '@/nodes/builtin/script.node'
import * as outputDisplay from '@/nodes/builtin/output-display.node'
import * as scratchpad from '@/nodes/builtin/scratchpad.node'
import * as compositeNode from '@/nodes/builtin/composite.node'
import { CustomEdge } from './custom-edge'

const registry = new Map<string, NodeTypeEntry>()
const familyOrder: FlxNodeFamily[] = ['source', 'human', 'data', 'effect', 'control', 'debug', 'layout']

const familyLabels: Record<FlxNodeFamily, string> = {
  source: 'Source',
  human: 'Human',
  data: 'Data',
  effect: 'Effect',
  control: 'Control',
  debug: 'Debug',
  layout: 'Layout',
}

export interface NodePaletteGroup {
  family: FlxNodeFamily
  label: string
  definitions: FlxNodeDefinition[]
}

// Register built-in nodes
const builtins: NodeTypeEntry[] = [
  { definition: textInput.definition, component: textInput.TextInputNode, runner: textInput.runner },
  { definition: numberInput.definition, component: numberInput.NumberInputNode, runner: numberInput.runner },
  { definition: enumSelector.definition, component: enumSelector.EnumSelectorNode, runner: enumSelector.runner },
  { definition: templateNode.definition, component: templateNode.TemplateNode, runner: templateNode.runner },
  { definition: commandNode.definition, component: commandNode.CommandNode, runner: commandNode.runner },
  { definition: inspectNode.definition, component: inspectNode.InspectNode, runner: inspectNode.runner },
  { definition: scriptNode.definition, component: scriptNode.ScriptNode, runner: scriptNode.runner },
  { definition: outputDisplay.definition, component: outputDisplay.OutputDisplayNode, runner: outputDisplay.runner },
  { definition: scratchpad.definition, component: scratchpad.ScratchpadNode, runner: scratchpad.runner },
  { definition: compositeNode.definition, component: compositeNode.CompositeNode, runner: compositeNode.runner },
]

for (const entry of builtins) {
  registry.set(entry.definition.id, entry)
}

export function getReactFlowNodeTypes(): NodeTypes {
  const types: NodeTypes = {}
  for (const [id, entry] of registry) {
    types[id] = entry.component
  }
  return types
}

export function getReactFlowEdgeTypes(): EdgeTypes {
  return { default: CustomEdge }
}

export function registerNodeType(entry: NodeTypeEntry): void {
  registry.set(entry.definition.id, entry)
}

export function getNodeRunner(typeId: string): FlxNodeRunner | undefined {
  return registry.get(typeId)?.runner
}

export function getNodeDefinition(typeId: string): FlxNodeDefinition | undefined {
  return registry.get(typeId)?.definition
}

export function getAllDefinitions(): FlxNodeDefinition[] {
  return Array.from(registry.values()).map((e) => e.definition)
}

export function getPaletteDefinitions(): FlxNodeDefinition[] {
  return getAllDefinitions()
    .filter((definition) => !definition.paletteHidden)
    .sort((a, b) => {
      const familyDelta = familyOrder.indexOf(a.family) - familyOrder.indexOf(b.family)
      if (familyDelta !== 0) return familyDelta
      return a.name.localeCompare(b.name)
    })
}

export function getPaletteGroups(): NodePaletteGroup[] {
  const definitions = getPaletteDefinitions()

  return familyOrder
    .map((family) => ({
      family,
      label: familyLabels[family],
      definitions: definitions.filter((definition) => definition.family === family),
    }))
    .filter((group) => group.definitions.length > 0)
}
