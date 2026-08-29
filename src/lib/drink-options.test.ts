import { describe, expect, test } from 'bun:test'
import {
  type DrinkConfiguration,
  drinkConfigurationForBrewingMethod,
  drinkSelectionForConfiguration,
  optionGroupsForDrinkType,
  selectedDrinkOptionValueIds,
} from '@/lib/drink-options'

const configuration: DrinkConfiguration = {
  drinkTypes: [
    { id: 1, name: 'Espresso', optionGroupIds: [] },
    { id: 2, name: 'Latte', optionGroupIds: [10] },
  ],
  optionGroups: [
    {
      id: 10,
      name: 'Milk',
      values: [
        { id: 100, name: 'Whole milk' },
        { id: 101, name: 'Oat milk' },
      ],
    },
  ],
}

describe('drink options', () => {
  test('limits drink types to those assigned to a brewing method', () => {
    expect(
      drinkConfigurationForBrewingMethod(configuration, {
        drinkTypeIds: [2],
      }).drinkTypes.map((type) => type.name),
    ).toEqual(['Latte'])
  })

  test('treats methods without assignments as allowing every drink type', () => {
    expect(
      drinkConfigurationForBrewingMethod(configuration, { drinkTypeIds: [] }),
    ).toBe(configuration)
  })

  test('clears a drink selection that is unavailable for the method', () => {
    const filtered = drinkConfigurationForBrewingMethod(configuration, {
      drinkTypeIds: [1],
    })
    expect(
      drinkSelectionForConfiguration(filtered, {
        drinkTypeId: '2',
        drinkOptionValueIds: { '10': '101' },
      }),
    ).toEqual({ drinkTypeId: '', drinkOptionValueIds: {} })
  })

  test('shows only groups assigned to the selected drink type', () => {
    expect(optionGroupsForDrinkType(configuration, '1')).toEqual([])
    expect(
      optionGroupsForDrinkType(configuration, '2').map((group) => group.name),
    ).toEqual(['Milk'])
  })

  test('drops stale option selections when the group is not applicable', () => {
    expect(
      selectedDrinkOptionValueIds(configuration, {
        drinkTypeId: '1',
        drinkOptionValueIds: { '10': '101' },
      }),
    ).toEqual([])
    expect(
      selectedDrinkOptionValueIds(configuration, {
        drinkTypeId: '2',
        drinkOptionValueIds: { '10': '101' },
      }),
    ).toEqual([101])
  })
})
