import { describe, expect, test } from 'bun:test'
import {
  createRoasterFormValues,
  roasterCreatePayload,
  roasterUpdatePayload,
} from '@/components/roasters/roaster-form-values'

describe('roaster form payloads', () => {
  test('omits create blanks and clears update blanks', () => {
    const values = createRoasterFormValues(null, 'Roaster')
    expect(roasterCreatePayload(values)).toMatchObject({
      name: 'Roaster',
      location: undefined,
      notes: undefined,
    })
    expect(roasterUpdatePayload(3, values)).toMatchObject({
      id: 3,
      location: null,
      country: null,
      website: null,
      instagramHandle: null,
      notes: null,
    })
  })
})
