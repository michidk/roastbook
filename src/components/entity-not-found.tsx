import { Link } from '@tanstack/react-router'
import { Page } from '@/components/page-layout'
import { Button } from '@/components/ui/button'

interface EntityNotFoundProps {
  entity: string
  backTo: string
  backLabel: string
}

/** Dead-end for detail pages whose loader returned no record. */
export function EntityNotFound({
  entity,
  backTo,
  backLabel,
}: EntityNotFoundProps) {
  return (
    <Page width="form">
      <div className="py-12 text-center">
        <h2 className="font-display text-xl font-bold">{entity} not found</h2>
        <Button asChild className="mt-4">
          <Link to={backTo}>{backLabel}</Link>
        </Button>
      </div>
    </Page>
  )
}
