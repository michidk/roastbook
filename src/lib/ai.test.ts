import { describe, expect, test } from 'bun:test'
import { parseMachineResearchResult } from '@/lib/server/ai-research-fields.server'
import type { MachineResearchPropertyKey } from '@/modules/ai/read-models'

const manualEvidence = (
  propertyKey: MachineResearchPropertyKey,
  sourceUrl = 'https://example.com/exact-model-manual.pdf',
) => ({
  propertyKey,
  sourceUrl,
  sourceTitle: 'Exact model manual',
  sourceKind: 'manual' as const,
})

describe('machine research validation', () => {
  test('rejects advertised pump pressure as brew or steam pressure', () => {
    expect(
      parseMachineResearchResult(
        JSON.stringify({
          factorySettings: {
            brewPressureBar: 15,
            steamPressureBar: 15,
            preinfusionEnabled: true,
          },
          evidence: [
            manualEvidence('factorySettings.brewPressureBar'),
            manualEvidence('factorySettings.steamPressureBar'),
            manualEvidence('factorySettings.preinfusionEnabled'),
          ],
        }),
      ),
    ).toEqual({
      factorySettings: { preinfusionEnabled: true },
      evidence: [manualEvidence('factorySettings.preinfusionEnabled')],
    })
  })

  test('keeps realistic documented specifications and factory settings', () => {
    const evidence = [
      manualEvidence('specifications.portafilterDiameterMm'),
      manualEvidence('specifications.preinfusionControl'),
      manualEvidence('factorySettings.brewPressureBar'),
      manualEvidence('factorySettings.preinfusionPressureBar'),
      manualEvidence('factorySettings.steamPressureBar'),
    ]

    expect(
      parseMachineResearchResult(
        JSON.stringify({
          specifications: {
            portafilterDiameterMm: 58,
            preinfusionControl: 'programmable',
          },
          factorySettings: {
            brewPressureBar: 9,
            preinfusionPressureBar: 3,
            steamPressureBar: 1.5,
          },
          evidence,
        }),
      ),
    ).toEqual({
      specifications: {
        portafilterDiameterMm: '58',
        preinfusionControl: 'programmable',
      },
      factorySettings: {
        brewPressureBar: '9',
        preinfusionPressureBar: '3',
        steamPressureBar: '1.5',
      },
      evidence,
    })
  })

  test('accepts signed temperature offsets and requires strong claim evidence', () => {
    expect(
      parseMachineResearchResult(
        JSON.stringify({
          factorySettings: {
            brewTemperatureOffsetCelsius: -1.5,
            programmedVolumeMl: 30,
          },
          evidence: [
            manualEvidence('factorySettings.brewTemperatureOffsetCelsius'),
            {
              propertyKey: 'factorySettings.programmedVolumeMl',
              sourceUrl: 'https://example.com/store-listing',
              sourceKind: 'retailer',
            },
          ],
        }),
      ),
    ).toEqual({
      factorySettings: { brewTemperatureOffsetCelsius: '-1.5' },
      evidence: [
        manualEvidence('factorySettings.brewTemperatureOffsetCelsius'),
      ],
    })
  })

  test('rejects contradictory ranges instead of retaining partial claims', () => {
    expect(
      parseMachineResearchResult(
        JSON.stringify({
          specifications: {
            brewPressureMinimumBar: 10,
            brewPressureMaximumBar: 9,
          },
          evidence: [
            manualEvidence('specifications.brewPressureMinimumBar'),
            manualEvidence('specifications.brewPressureMaximumBar'),
          ],
        }),
      ),
    ).toEqual({})
  })
})
