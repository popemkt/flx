import type { NodeTypes, EdgeTypes } from '@xyflow/react'
import type { FlxNodeDefinition, FlxNodeRunner, NodeTypeEntry } from '@/types/node'

import * as textInput from '@/nodes/builtin/text-input.node'
import * as numberInput from '@/nodes/builtin/number-input.node'
import * as enumSelector from '@/nodes/builtin/enum-selector.node'
import * as scriptNode from '@/nodes/builtin/script.node'
import * as outputDisplay from '@/nodes/builtin/output-display.node'
import { CustomEdge } from './custom-edge'

const registry = new Map<string, NodeTypeEntry>()

// Register built-in nodes
const builtins: NodeTypeEntry[] = [
  { definition: textInput.definition, component: textInput.TextInputNode, runner: textInput.runner },
  { definition: numberInput.definition, component: numberInput.NumberInputNode, runner: numberInput.runner },
  { definition: enumSelector.definition, component: enumSelector.EnumSelectorNode, runner: enumSelector.runner },
  { definition: scriptNode.definition, component: scriptNode.ScriptNode, runner: scriptNode.runner },
  { definition: outputDisplay.definition, component: outputDisplay.OutputDisplayNode, runner: outputDisplay.runner },
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
