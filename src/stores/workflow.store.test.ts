import { beforeEach, describe, expect, it } from 'vitest'
import type { Node } from '@xyflow/react'
import { useWorkflowStore } from './workflow.store'
import { getNodeDefinition } from '@/canvas/node-types-registry'
import type { FlxNodeData } from '@/types/node'

function createNode(
  id: string,
  typeId: string,
  x: number,
  y: number,
  selected = true,
): Node<FlxNodeData> {
  const definition = getNodeDefinition(typeId)
  if (!definition) {
    throw new Error(`Missing definition for ${typeId}`)
  }

  return {
    id,
    type: typeId,
    selected,
    position: { x, y },
    width: 200,
    height: 120,
    data: {
      definition,
      config: definition.defaultConfig ? { ...definition.defaultConfig } : {},
      label: definition.name,
      workflowId: 'default',
    },
  }
}

describe('workflow store composites', () => {
  beforeEach(() => {
    useWorkflowStore.setState({ nodes: [], edges: [], workflows: [] })
  })

  it('groups selected nodes into a composite boundary', () => {
    useWorkflowStore.getState().setNodes([
      createNode('text-1', 'text-input', 120, 140),
      createNode('command-1', 'command', 420, 200),
    ])

    useWorkflowStore.getState().groupSelectionAsComposite()

    const { nodes } = useWorkflowStore.getState()
    const composite = nodes.find((node) => node.type === 'composite')
    const children = nodes.filter((node) => node.parentId === composite?.id)

    expect(composite).toBeDefined()
    expect(children).toHaveLength(2)
    expect(composite?.data.config.childNodeIds).toEqual(['text-1', 'command-1'])
    expect(children.every((node) => node.extent === 'parent')).toBe(true)
  })

  it('collapses and re-expands composite children', () => {
    useWorkflowStore.getState().setNodes([
      createNode('text-1', 'text-input', 120, 140),
      createNode('command-1', 'command', 420, 200),
    ])

    useWorkflowStore.getState().groupSelectionAsComposite()
    const compositeId = useWorkflowStore.getState().nodes.find((node) => node.type === 'composite')?.id
    if (!compositeId) {
      throw new Error('Expected composite node')
    }

    useWorkflowStore.getState().toggleCompositeCollapse(compositeId)

    let state = useWorkflowStore.getState()
    expect(state.nodes.find((node) => node.id === compositeId)?.data.config.collapsed).toBe(true)
    expect(state.nodes.filter((node) => node.parentId === compositeId).every((node) => node.hidden)).toBe(true)

    useWorkflowStore.getState().toggleCompositeCollapse(compositeId)

    state = useWorkflowStore.getState()
    expect(state.nodes.find((node) => node.id === compositeId)?.data.config.collapsed).toBe(false)
    expect(state.nodes.filter((node) => node.parentId === compositeId).every((node) => !node.hidden)).toBe(true)
  })
})
