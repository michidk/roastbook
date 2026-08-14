import { getRouteApi } from '@tanstack/react-router'

const rootRoute = getRouteApi('__root__')

export function useAppSettings() {
  return rootRoute.useLoaderData()
}
