import { describe, expect, test } from 'bun:test'
import {
  BREW_PARAMETER_VALUES,
  EQUIPMENT_TYPE_VALUES,
} from '@roastbook/open-coffee-schema'
import { GEAR_TYPE_VALUES } from '@/lib/domain-contracts'
import { SHOT_PARAMETER_KEYS } from '@/lib/shot-parameters'
import {
  fromOpenCoffeeParameter,
  fromOpenCoffeeRatioParameter,
  toOpenCoffeeEquipmentType,
  toOpenCoffeeParameter,
  toOpenCoffeeRatioParameter,
} from './mapping'

describe('Open Coffee mapping', () => {
  test('maps parameter names both ways', () => {
    expect(toOpenCoffeeParameter('doseGrams')).toBe('dose_g')
    expect(toOpenCoffeeParameter('shotTimeSeconds')).toBe('brew_time_seconds')
    expect(toOpenCoffeeParameter('bloomWaterGrams')).toBe('bloom_water_g')
    expect(toOpenCoffeeParameter('pourCount')).toBe('pour_count')
    expect(toOpenCoffeeParameter('machineId')).toBeNull()
    expect(toOpenCoffeeParameter('ratioBasis')).toBeNull()
    for (const key of SHOT_PARAMETER_KEYS) {
      const parameter = toOpenCoffeeParameter(key)
      if (parameter) expect(fromOpenCoffeeParameter(parameter)).toBe(key)
    }
  })

  test('covers every open parameter', () => {
    for (const parameter of BREW_PARAMETER_VALUES) {
      expect(fromOpenCoffeeParameter(parameter)).not.toBeNull()
    }
    expect(fromOpenCoffeeParameter('yield_ratio')).toBe('ratioBasis')
  })

  test('maps the ratio basis to the ratio parameter', () => {
    expect(toOpenCoffeeRatioParameter('brew_water')).toBe('brew_ratio')
    expect(toOpenCoffeeRatioParameter('target_yield')).toBe('yield_ratio')
    expect(fromOpenCoffeeRatioParameter('brew_ratio')).toBe('brew_water')
    expect(fromOpenCoffeeRatioParameter('yield_ratio')).toBe('target_yield')
    expect(fromOpenCoffeeRatioParameter('dose_g')).toBeNull()
  })

  test('gear types are the open equipment types plus other', () => {
    expect(new Set<string>(GEAR_TYPE_VALUES)).toEqual(
      new Set([...EQUIPMENT_TYPE_VALUES, 'other']),
    )
    expect(toOpenCoffeeEquipmentType('other')).toBe('accessory')
    expect(toOpenCoffeeEquipmentType('grinder')).toBe('grinder')
  })
})
