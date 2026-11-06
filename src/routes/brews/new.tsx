import { Button } from '@roastbook/ui/button'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Page, PageHeader } from '@/components/page-layout'
import { NewShotForm } from '@/components/shots/new-shot-form'
import { getActiveBeanPurchases } from '@/journal/beans'
import { getBrewingMethods } from '@/journal/brewing-methods'
import { getDrinkConfiguration } from '@/journal/drink-options'
import { getGear } from '@/journal/gear'
import { getGearSets } from '@/journal/gear-sets'
import { getRecipes } from '@/journal/recipes'
import {
  getBeanSuggestions,
  getBrewingMethodSuggestions,
  getDrinkTypeSuggestions,
  getLastBeansByBrewingMethod,
  getTasteTagSuggestions,
} from '@/journal/suggestions'
import { getTasteTags } from '@/journal/taste-tags'
import { DEMO_MODE } from '@/lib/build-mode'
import { integrationCapability } from '@/lib/client/integration-capability'
import { isConnectionOnline } from '@/lib/connection-status'
import { searchValidator } from '@/lib/search-params'
import { checkShotRecommendationEnabled } from '@/lib/server/shot-recommendations'
import { getShottimerSettings } from '@/lib/server/shottimer'
import { parseNewBrewSearch } from '@/routes/brews/-lib/new-brew-search'

export const Route = createFileRoute('/brews/new')({
  validateSearch: searchValidator(parseNewBrewSearch),
  loader: async (): Promise<NewBrewLoaderData> => {
    const defaultBrewedAt = new Date().toISOString()

    const data = await loadNewBrewReferenceData()
    return { ...data, defaultBrewedAt }
  },
  component: NewShotPage,
})

type NewBrewReferenceData = Awaited<ReturnType<typeof loadNewBrewReferenceData>>
type NewBrewLoaderData = NewBrewReferenceData & {
  readonly defaultBrewedAt: string
}

async function loadNewBrewReferenceData() {
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
    drinkTypeSuggestions,
    tasteTagSuggestions,
    shottimer,
  ] = await Promise.all([
    getActiveBeanPurchases(),
    getBrewingMethods(),
    getRecipes(),
    getTasteTags(),
    getBeanSuggestions(),
    getBrewingMethodSuggestions(),
    getLastBeansByBrewingMethod(),
    getGear(),
    getGearSets(),
    integrationCapability(checkShotRecommendationEnabled)(),
    getDrinkConfiguration(),
    getDrinkTypeSuggestions(),
    getTasteTagSuggestions(),
    DEMO_MODE || !isConnectionOnline()
      ? Promise.resolve({ enabled: false })
      : getShottimerSettings().catch(() => ({ enabled: false })),
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
    drinkTypeSuggestions,
    tasteTagSuggestions,
    shottimerEnabled: shottimer.enabled,
  }
}

function NewShotPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()

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
        initialBean={{
          beanId: search.beanId,
          beanPurchaseId: search.beanPurchaseId,
        }}
        onSaved={async () => {
          await navigate({ to: '/brews' })
          toast.success('Brew saved', {
            action: {
              label: 'Log another',
              onClick: () => void navigate({ to: '/brews/new', search }),
            },
          })
        }}
      />
    </Page>
  )
}
