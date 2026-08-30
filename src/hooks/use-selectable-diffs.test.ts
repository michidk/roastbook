import { describe, expect, test } from 'bun:test'
import {
  buildSelectableDiffs,
  getDefaultSelectedKeys,
} from '@/hooks/use-selectable-diffs'

const fields = [
  { key: 'name', label: 'Name' },
  { key: 'size', label: 'Size', format: (value: string) => `${value} g` },
] as const

describe('buildSelectableDiffs', () => {
  test('builds new and conflicting differences', () => {
    const result = buildSelectableDiffs(fields, (field) =>
      field.key === 'name'
        ? { currentValue: '', suggestedValue: 'House blend' }
        : { currentValue: 250, suggestedValue: 500 },
    )

    expect(result).toEqual([
      {
        key: 'name',
        label: 'Name',
        format: undefined,
        currentValue: '',
        suggestedValue: 'House blend',
        hasConflict: false,
      },
      {
        key: 'size',
        label: 'Size',
        format: fields[1].format,
        currentValue: '250',
        suggestedValue: '500',
        hasConflict: true,
      },
    ])
  })

  test('omits unavailable and unchanged values', () => {
    const result = buildSelectableDiffs(fields, (field) => {
      if (field.key === 'name') return undefined
      return { currentValue: 250, suggestedValue: '250' }
    })

    expect(result).toEqual([])
  })

  test('selects only additions by default', () => {
    const diffs = buildSelectableDiffs(fields, (field) =>
      field.key === 'name'
        ? { currentValue: '', suggestedValue: 'House blend' }
        : { currentValue: 250, suggestedValue: 500 },
    )

    expect(getDefaultSelectedKeys(diffs)).toEqual(new Set(['name']))
  })
})
