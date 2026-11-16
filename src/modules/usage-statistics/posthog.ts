type AnalyticsContext = {
  deploymentType: string
  release: string | undefined
  properties?: object
}

export function analyticsProperties({
  deploymentType,
  release,
  properties = {},
}: AnalyticsContext) {
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
}: AnalyticsContext & {
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
