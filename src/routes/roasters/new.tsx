import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'
import { FormPageHeader } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { RoasterForm } from '@/components/roasters/roaster-form'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/roasters/new')({
  component: NewRoasterPage,
})

function NewRoasterPage() {
  const navigate = useNavigate()

  return (
    <Page width="form">
      <FormPageHeader
        title="Add roaster"
        leading={
          <Button variant="ghost" size="icon" asChild>
            <Link to="/roasters">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
      />
      <RoasterForm
        onCreated={(roaster) =>
          navigate({
            to: '/roasters/$roasterId',
            params: { roasterId: String(roaster.id) },
          })
        }
        onCancel={() => navigate({ to: '/roasters' })}
      />
    </Page>
  )
}
