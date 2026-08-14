import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { BeanForm } from '@/components/beans/bean-form'
import { FormPageHeader } from '@/components/form/form-shell'
import { Page } from '@/components/page-layout'
import { getRoasters } from '@/lib/server/roasters'

export const Route = createFileRoute('/beans/new')({
  loader: () => getRoasters(),
  component: NewBeanPage,
})

function NewBeanPage() {
  const roasters = Route.useLoaderData()
  const navigate = useNavigate()

  return (
    <Page width="form">
      <FormPageHeader
        title="Add beans"
        description="Add a new bag of coffee to your collection"
      />
      <BeanForm
        roasters={roasters}
        onCreated={(bean) =>
          navigate({
            to: '/beans/$beanId',
            params: { beanId: String(bean.id) },
          })
        }
        onCancel={() => navigate({ to: '/beans' })}
      />
    </Page>
  )
}
