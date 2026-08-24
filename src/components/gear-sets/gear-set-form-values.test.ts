import { describe, expect, test } from 'bun:test'
import {
  EMPTY_GEAR_SET_FORM_VALUES,
  gearSetFormValuesFrom,
  gearSetWritePayload,
} from '@/components/gear-sets/gear-set-form-values'

describe('gear set form values', () => {
  test('maps a stored gear set into string form values', () => {
    expect(
      gearSetFormValuesFrom({
        name: 'Work',
        description: null,
        machineId: 4,
        grinderId: null,
        basketId: 9,
        accessoryGearIds: [5, 6],
      }),
    ).toEqual({
      name: 'Work',
      description: '',
      machineId: '4',
      grinderId: '',
      basketId: '9',
      accessoryGearIds: [5, 6],
    })
  })

  test('converts empty selections into nulls for the write payload', () => {
    expect(
      gearSetWritePayload({
        ...EMPTY_GEAR_SET_FORM_VALUES,
        name: '  Work  ',
        description: '   ',
      }),
    ).toEqual({
      name: 'Work',
      description: null,
      machineId: null,
      grinderId: null,
      basketId: null,
      accessoryGearIds: [],
    })
  })

  test('converts selected ids into numbers for the write payload', () => {
    expect(
      gearSetWritePayload({
        name: 'Home',
        description: 'Kitchen counter setup',
        machineId: '4',
        grinderId: '3',
        basketId: '9',
        accessoryGearIds: [5],
      }),
    ).toEqual({
      name: 'Home',
      description: 'Kitchen counter setup',
      machineId: 4,
      grinderId: 3,
      basketId: 9,
      accessoryGearIds: [5],
    })
  })
})
