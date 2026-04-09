import { describe, expect, it } from 'vitest'
import { canConnect, coerceValue } from './port'

describe('port utilities', () => {
  it('allows compatible connections', () => {
    expect(canConnect('number', 'string')).toBe(true)
    expect(canConnect('regex', 'number')).toBe(false)
  })

  it('coerces values between supported types', () => {
    expect(coerceValue(42, 'number', 'string')).toBe('42')
    expect(coerceValue(true, 'boolean', 'number')).toBe(1)
    expect(coerceValue(/hello/i, 'regex', 'string')).toBe('hello')
  })

  it('wraps values when coercing to json', () => {
    expect(coerceValue('abc', 'string', 'json')).toEqual({
      value: 'abc',
      originalType: 'string',
    })
  })
})
