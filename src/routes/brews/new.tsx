import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Page, PageHeader } from '@/components/page-layout'
import { NewShotForm } from '@/components/shots/new-shot-form'
import { Button } from '@/components/ui/button'
import { searchValidator } from '@/lib/search-params'
import { getActiveBeanPurchases } from '@/lib/server/beans'
import { getBrewingMethods } from '@/lib/server/brewing-methods'
import { getDrinkConfiguration } from '@/lib/server/drink-options'
import { getGear } from '@/lib/server/gear'
import { getGearSets } from '@/lib/server/gear-sets'
import { getRecipes } from '@/lib/server/recipes'
import { checkShotRecommendationEnabled } from '@/lib/server/shot-recommendations'
import {
  getBeanSuggestions,
  getBrewingMethodSuggestions,
  getDrinkTypeSuggestions,
  getLastBeansByBrewingMethod,
  getTasteTagSuggestions,
} from '@/lib/server/suggestions'
import { getTasteTags } from '@/lib/server/taste-tags'
import { parseNewBrewSearch } from '@/routes/brews/-lib/new-brew-search'

export const Route = createFileRoute('/brews/new')({
  validateSearch: searchValidator(parseNewBrewSearch),
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
      drinkTypeSuggestions,
      tasteTagSuggestions,
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
      checkShotRecommendationEnabled(),
      getDrinkConfiguration(),
      getDrinkTypeSuggestions(),
      getTasteTagSuggestions(),
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
      defaultBrewedAt: new Date().toISOString(),
    }
  },
  component: NewShotPage,
})

function NewShotPage() {
  const data = Route.useLoaderData()
  const search = Route.useSearch()
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
        initialBean={{
          beanId: search.beanId,
          beanPurchaseId: search.beanPurchaseId,
        }}
        onSaved={async () => {
          await router.invalidate()
          await navigate({ to: '/brews' })
          toast.success('Brew saved', {
            action: {
              label: 'Log another',
              onClick: () => void navigate({ to: '/brews/new' }),
            },
          })
        }}
      />
    </Page>
  )
}
