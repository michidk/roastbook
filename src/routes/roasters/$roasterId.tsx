import {
  createFileRoute,
  Link,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { ArrowLeft, ExternalLink, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { EntityNotFound } from '@/components/entity-not-found'
import { Page, PageHeader } from '@/components/page-layout'
import { RoasterFields } from '@/components/roasters/roaster-fields'
import {
  createRoasterFormValues,
  roasterUpdatePayload,
} from '@/components/roasters/roaster-form-values'
import { RoasterResearchAction } from '@/components/roasters/roaster-research-action'
import { RouteError } from '@/components/route-error'
import { DetailPending } from '@/components/route-pending'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WebsiteLogo } from '@/components/website-logo'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { getRoastLevelLabel } from '@/lib/constants'
import { parseEditModeSearch } from '@/lib/edit-mode'
import { getErrorMessage } from '@/lib/error-message'
import { parseIdParam } from '@/lib/route-params'
import { searchValidator } from '@/lib/search-params'
import { deleteRoaster, getRoaster, updateRoaster } from '@/lib/server/roasters'

export const Route = createFileRoute('/roasters/$roasterId')({
  validateSearch: searchValidator(parseEditModeSearch),
  loader: ({ params }) => getRoaster({ data: parseIdParam(params.roasterId) }),
  component: RoasterDetailPage,
  pendingComponent: DetailPending,
  errorComponent: ({ error }) => (
    <RouteError error={error} backTo="/roasters" backLabel="Back to roasters" />
  ),
})

function RoasterDetailPage() {
  const roaster = Route.useLoaderData()
  const { edit: isEditing = false } = Route.useSearch()
  const navigate = useNavigate({ from: '/roasters/$roasterId' })
  const router = useRouter()
  const {
    values: formData,
    set,
    patch,
    setValues: setFormData,
  } = useFormState(() => createRoasterFormValues(roaster))
  const { isSubmitting: isSaving, handleSubmit: handleSave } =
    useFormSubmission({
      canSubmit: () => Boolean(roaster) && Boolean(formData.name.trim()),
      submit: async () => {
        if (!roaster) return
        await updateRoaster({
          data: roasterUpdatePayload(roaster.id, formData),
        })
        await navigate({
          search: (current) => ({ ...current, edit: undefined }),
          replace: true,
        })
        await router.invalidate()
      },
      onError: (error) =>
        toast.error(getErrorMessage(error, 'Failed to update roaster')),
    })

  if (!roaster) {
    return (
      <EntityNotFound
        entity="Roaster"
        backTo="/roasters"
        backLabel="Back to roasters"
      />
    )
  }

  const handleDelete = async () => {
    await deleteRoaster({ data: roaster.id })
    await router.invalidate()
    await navigate({ to: '/roasters' })
  }

  const handleCancelEdit = () => {
    setFormData(createRoasterFormValues(roaster))
    void navigate({
      search: (current) => ({ ...current, edit: undefined }),
      replace: true,
    })
  }

  const beanCount = roaster.beans?.length ?? 0

  return (
    <Page width="form">
      <PageHeader
        size="compact"
        title={
          <span className="inline-flex items-center gap-3">
            <WebsiteLogo
              entityType="roasters"
              entityId={roaster.id}
              website={roaster.website}
              updatedAt={roaster.updatedAt}
              className="size-12"
            />
            <span>
              {isEditing ? formData.name || roaster.name : roaster.name}
            </span>
          </span>
        }
        description={
          (isEditing ? formData.location : roaster.location)
            ? [
                isEditing ? formData.location : roaster.location,
                isEditing ? formData.country : roaster.country,
              ]
                .filter(Boolean)
                .join(', ')
            : undefined
        }
        leading={
          <Button variant="outline" size="icon" asChild>
            <Link to="/roasters" aria-label="Back to roasters">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
        }
        actions={
          <>
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  form="roaster-edit-form"
                  disabled={isSaving || !formData.name.trim()}
                >
                  {isSaving ? 'Saving…' : 'Save'}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link
                  to="/roasters/$roasterId"
                  params={{ roasterId: String(roaster.id) }}
                  search={{ edit: true }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
            )}
            <DeleteConfirmation
              title="Delete this roaster?"
              description="This will remove the roaster from your collection. Beans linked to this roaster will keep their text roaster field."
              onConfirm={handleDelete}
              trigger={
                <Button variant="ghost" size="icon" aria-label="Delete roaster">
                  <Trash2 className="h-4 w-4" />
                </Button>
              }
            />
          </>
        }
      />

      {isEditing ? (
        <>
          <div className="flex justify-end">
            <RoasterResearchAction
              currentData={formData}
              disabled={isSaving}
              onApply={(updates) => {
                patch(updates)
                toast.success(`Applied ${Object.keys(updates).length} changes`)
              }}
            />
          </div>
          <form id="roaster-edit-form" onSubmit={handleSave}>
            <RoasterFields
              values={formData}
              onChange={set}
              idPrefix="roaster-edit"
            />
          </form>
        </>
      ) : (
        <>
          {(roaster.website || roaster.instagramHandle) && (
            <Card>
              <CardHeader>
                <CardTitle>Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {roaster.website && (
                  <a
                    href={roaster.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-2 rounded-md text-sm text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Website
                  </a>
                )}
                {roaster.instagramHandle && (
                  <a
                    href={`https://instagram.com/${roaster.instagramHandle.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center gap-2 rounded-md text-sm text-link hover:underline [@media(hover:hover)_and_(pointer:fine)]:min-h-0"
                  >
                    <ExternalLink className="h-4 w-4" />@
                    {roaster.instagramHandle.replace('@', '')}
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {roaster.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{roaster.notes}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>
                Beans
                {beanCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {beanCount}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {beanCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No beans from this roaster yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {roaster.beans?.map((bean) => (
                    <Link
                      key={bean.id}
                      to="/beans/$beanId"
                      params={{ beanId: String(bean.id) }}
                      className="flex min-h-11 items-center justify-between rounded-md p-2 transition-colors hover:bg-muted/50"
                    >
                      <span className="font-medium">{bean.name}</span>
                      {bean.roastLevel && (
                        <Badge variant="outline" className="capitalize text-xs">
                          {getRoastLevelLabel(bean.roastLevel)}
                        </Badge>
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Page>
  )
}
