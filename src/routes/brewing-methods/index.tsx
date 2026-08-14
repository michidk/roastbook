import { createFileRoute } from '@tanstack/react-router'
import { BrewingMethodSettings } from '@/components/brewing-methods/brewing-method-settings'
import { FormPageHeader } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { getBrewingMethods } from '@/lib/server/brewing-methods'

export const Route = createFileRoute('/brewing-methods/')({
  loader: () => getBrewingMethods(),
  component: BrewingMethodsPage,
})

function BrewingMethodsPage() {
  const methods = Route.useLoaderData()
  return (
    <Page width="wide">
      <FormPageHeader
        title="Brewing methods"
        description="Define each method and the shot parameters it uses. Recipes and shots always belong to one method."
      />
      <BrewingMethodSettings methods={methods} />
    </Page>
  )
}
