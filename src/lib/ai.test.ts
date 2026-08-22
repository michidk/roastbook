import { describe, expect, test } from 'bun:test'
import { MACHINE_SETTINGS_FIELDS } from '@/lib/ai'
import { parseStructuredResearchResult } from '@/lib/structured-research'

describe('machine research validation', () => {
  test('rejects advertised pump pressure as brew or steam pressure', () => {
    expect(
      parseStructuredResearchResult(
        JSON.stringify({
          brewPressureOpvBar: 15,
          steamPressureBar: 15,
          supportsPreinfusion: true,
        }),
        MACHINE_SETTINGS_FIELDS,
      ),
    ).toEqual({ supportsPreinfusion: true })
  })

  test('keeps realistic documented operating pressures', () => {
    expect(
      parseStructuredResearchResult(
        JSON.stringify({
          brewPressureOpvBar: 9,
          defaultPreinfusionPressureBar: 3,
          steamPressureBar: 1.5,
        }),
        MACHINE_SETTINGS_FIELDS,
      ),
    ).toEqual({
      brewPressureOpvBar: '9',
      defaultPreinfusionPressureBar: '3',
      steamPressureBar: '1.5',
    })
  })
})
