export function analyticsProperties({
  deploymentType,
  release,
  properties = {},
}: {
  deploymentType: string
  release: string | undefined
  properties?: object
}) {
  return {
    ...properties,
    deployment_type: deploymentType,
    release: release ?? 'unknown',
  }
}

export function postHogEvent({
  projectToken,
  event,
  distinctId,
  personProfile,
  ...context
}: Parameters<typeof analyticsProperties>[0] & {
  projectToken: string
  event: string
  distinctId: string
  personProfile: boolean
}) {
  return {
    api_key: projectToken,
    event,
    distinct_id: distinctId,
    properties: {
      ...analyticsProperties(context),
      $process_person_profile: personProfile,
    },
  }
}
