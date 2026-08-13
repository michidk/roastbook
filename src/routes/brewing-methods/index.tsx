import { createFileRoute } from "@tanstack/react-router"
import { BrewingMethodSettings } from "@/components/brewing-methods/brewing-method-settings"
import { FormPageHeader } from "@/components/form/form-shell"
import { getBrewingMethods } from "@/lib/server/brewing-methods"

export const Route = createFileRoute("/brewing-methods/")({
  loader: () => getBrewingMethods(),
  component: BrewingMethodsPage,
})

function BrewingMethodsPage() {
  const methods = Route.useLoaderData()
  return (
    <div className="mx-auto max-w-4xl space-y-6 md:space-y-8">
      <FormPageHeader
        title="Brewing methods"
        description="Define each method and the shot parameters it uses. Recipes and shots always belong to one method."
      />
      <BrewingMethodSettings methods={methods} />
    </div>
  )
}
