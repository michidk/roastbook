import { createFileRoute, redirect } from '@tanstack/react-router'
import { searchValidator } from '@/lib/search-params'
import { parseNewBrewSearch } from '@/routes/brews/-lib/new-brew-search'

export const Route = createFileRoute('/shots/new')({
  validateSearch: searchValidator(parseNewBrewSearch),
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/brews/new', search, replace: true })
  },
})
