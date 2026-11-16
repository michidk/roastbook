import { expect, test } from 'bun:test'
import { analyticsProperties, postHogEvent } from './posthog'

test('keeps deployment and revision metadata authoritative across event properties', () => {
  expect<unknown>(
    analyticsProperties({
      deploymentType: 'self_hosted',
      release: 'revision',
      properties: { deployment_type: 'wrong', release: 'wrong', count: 1 },
    }),
  ).toEqual({ deployment_type: 'self_hosted', release: 'revision', count: 1 })
  expect<unknown>(
    analyticsProperties({ deploymentType: 'custom', release: undefined }),
  ).toEqual({ deployment_type: 'custom', release: 'unknown' })
})

test('builds the common envelope without adding identity or enabling person profiles', () => {
  expect<unknown>(
    postHogEvent({
      projectToken: 'token',
      event: 'bean_created',
      distinctId: 'anonymous',
      deploymentType: 'self_hosted',
      release: undefined,
      personProfile: false,
      properties: { $geoip_disable: true, $process_person_profile: true },
    }),
  ).toEqual({
    api_key: 'token',
    event: 'bean_created',
    distinct_id: 'anonymous',
    properties: {
      deployment_type: 'self_hosted',
      release: 'unknown',
      $process_person_profile: false,
      $geoip_disable: true,
    },
  })
})
