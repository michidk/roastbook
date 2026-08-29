import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { Page, PageHeader } from '@/components/page-layout'
import { NewShotForm } from '@/components/shots/new-shot-form'
import { Button } from '@/components/ui/button'
import { getActiveBeans } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getDrinkConfiguration } from '@/lib/server/drink-options'
import { getGear } from '@/lib/server/gear'
import { getGearSets } from '@/lib/server/gear-sets'
import { getRecipes } from '@/lib/server/recipes'
import { checkShotRecommendationEnabled } from '@/lib/server/shot-recommendations'
import {
  getBeanSuggestions,
  getBrewingMethodSuggestions,
  getLastBeansByBrewingMethod,
} from '@/lib/server/suggestions'
import { getTasteTags } from '@/lib/server/taste-tags'

export const Route = createFileRoute('/brews/new')({
  loader: async () => {
    const [
      beans,
      methods,
      recipes,
      tasteTags,
      beanSuggestions,
      brewingMethodSuggestions,
      lastBeansByBrewingMethod,
      gear,
      gearSets,
      recommendation,
      drinks,
    ] = await Promise.all([
      getActiveBeans(),
      getBrewingMethods(),
      getRecipes(),
      getTasteTags(),
      getBeanSuggestions(),
      getBrewingMethodSuggestions(),
      getLastBeansByBrewingMethod(),
      getGear(),
      getGearSets(),
      checkShotRecommendationEnabled(),
      getDrinkConfiguration(),
    ])
    return {
      beans,
      methods,
      recipes,
      tasteTags,
      beanSuggestions,
      brewingMethodSuggestions,
      lastBeansByBrewingMethod,
      gear,
      gearSets,
      recommendationEnabled: recommendation.enabled,
      drinks,
      defaultBrewedAt: new Date().toISOString(),
    }
  },
  component: NewShotPage,
})

function NewShotPage() {
  const data = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()

  return (
    <Page>
      <PageHeader
        title="New brew"
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/brews" aria-label="Back to brews">
              <ArrowLeft aria-hidden="true" />
            </Link>
          </Button>
        }
      />
      <NewShotForm
        data={data}
        onSaved={async () => {
          await router.invalidate()
          await navigate({ to: '/brews' })
        }}
      />
    </Page>
  )
}
