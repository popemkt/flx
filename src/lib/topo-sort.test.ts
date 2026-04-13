import { describe, expect, it } from 'vitest'
import { topoSort } from './topo-sort'

describe('topoSort', () => {
  it('returns nodes in dependency order', () => {
    const sorted = topoSort(
      ['input', 'transform', 'output'],
      [
        { from: 'input', to: 'transform' },
        { from: 'transform', to: 'output' },
      ],
    )

    expect(sorted).toEqual(['input', 'transform', 'output'])
  })

  it('throws on cycles', () => {
    expect(() =>
      topoSort(
        ['a', 'b'],
        [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'a' },
        ],
      ),
    ).toThrow('Workflow contains a cycle')
  })
})
