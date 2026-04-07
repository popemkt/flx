export type PortDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'json'
  | 'file-path'
  | 'regex'

export type PortValue =
  | string
  | number
  | boolean
  | string[]
  | Record<string, unknown>
  | RegExp

export interface PortDefinition {
  id: string
  label: string
  dataType: PortDataType
  enumValues?: string[]
  defaultValue?: PortValue
  required?: boolean
  description?: string
}

export interface PortsDefinition {
  inputs: PortDefinition[]
  outputs: PortDefinition[]
}

export const COERCION_MATRIX: Record<PortDataType, Partial<Record<PortDataType, true>>> = {
  string: { string: true, json: true },
  number: { number: true, string: true, json: true, boolean: true },
  boolean: { boolean: true, string: true, number: true, json: true },
  enum: { enum: true, string: true, json: true },
  json: { json: true, string: true },
  'file-path': { 'file-path': true, string: true, json: true },
  regex: { regex: true, string: true, json: true },
}

export function canConnect(sourceType: PortDataType, targetType: PortDataType): boolean {
  return COERCION_MATRIX[sourceType]?.[targetType] === true
}

export function coerceValue(value: PortValue, from: PortDataType, to: PortDataType): PortValue {
  if (from === to) return value
  if (from === 'number' && to === 'string') return String(value)
  if (from === 'number' && to === 'boolean') return value !== 0
  if (from === 'boolean' && to === 'string') return String(value)
  if (from === 'boolean' && to === 'number') return value ? 1 : 0
  if (from === 'enum' && to === 'string') return String(value)
  if (from === 'file-path' && to === 'string') return String(value)
  if (from === 'regex' && to === 'string') return (value as RegExp).source
  if (to === 'json') return { value, originalType: from }
  if (from === 'json' && to === 'string') return JSON.stringify(value)
  throw new Error(`Cannot coerce ${from} to ${to}`)
}

export const PORT_COLORS: Record<PortDataType, string> = {
  string: '#22c55e',
  number: '#3b82f6',
  boolean: '#eab308',
  enum: '#a855f7',
  json: '#f97316',
  'file-path': '#06b6d4',
  regex: '#ef4444',
}
