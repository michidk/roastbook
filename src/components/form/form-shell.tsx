import { type ReactNode, type SyntheticEvent, useId } from 'react'
import { PageHeader } from '@/components/page-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface FormPageHeaderProps {
  title: string
  description?: string
  leading?: ReactNode
}

export function FormPageHeader({
  title,
  description,
  leading,
}: FormPageHeaderProps) {
  return (
    <PageHeader title={title} description={description} leading={leading} />
  )
}

interface FormSectionProps {
  title?: string
  titleAs?: 'h2' | 'h3'
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}

export function FormSection({
  title,
  titleAs = 'h2',
  description,
  action,
  children,
  className,
  contentClassName,
}: FormSectionProps) {
  const headingId = useId()

  return (
    <Card
      className={className}
      role={title ? 'group' : undefined}
      aria-labelledby={title ? headingId : undefined}
    >
      {title ? (
        <CardHeader
          className={cn(action && 'flex flex-row items-center justify-between')}
        >
          <div className="space-y-1">
            <CardTitle as={titleAs} id={headingId}>
              {title}
            </CardTitle>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </CardHeader>
      ) : null}
      <CardContent className={cn('space-y-4', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

export interface FormActionsProps {
  onCancel: () => void
  isSubmitting?: boolean
  disabled?: boolean
  submitLabel?: string
  submittingLabel?: string
  cancelLabel?: string
  className?: string
}

export function FormActions({
  onCancel,
  isSubmitting = false,
  disabled = false,
  submitLabel = 'Save',
  submittingLabel = 'Saving…',
  cancelLabel = 'Cancel',
  className,
}: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
        className,
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        disabled={isSubmitting || disabled}
        className="sm:min-w-36"
      >
        {isSubmitting ? submittingLabel : submitLabel}
      </Button>
    </div>
  )
}

export function FormErrorSummary({
  errors,
}: {
  readonly errors: Readonly<Record<string, string>>
}) {
  const messages = [...new Set(Object.values(errors))]
  if (messages.length === 0) return null

  return (
    <div
      role="alert"
      className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-text"
    >
      <p className="font-bold">Check the highlighted fields.</p>
      <ul className="mt-1 list-disc space-y-1 pl-5">
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </ul>
    </div>
  )
}

interface EntityFormProps {
  onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void
  children: ReactNode
  actions?: FormActionsProps
  id?: string
  className?: string
}

export function EntityForm({
  onSubmit,
  children,
  actions,
  id,
  className,
}: EntityFormProps) {
  return (
    <form
      id={id}
      // A form rendered inside a dialog is portalled out of its parent form in
      // the DOM, but React still bubbles the submit event up the *React* tree —
      // so without this an inline "create entity" modal also submits the page
      // form behind it.
      onSubmit={(event) => {
        event.stopPropagation()
        onSubmit(event)
      }}
      className={cn('space-y-5 sm:space-y-6', className)}
    >
      {children}
      {actions ? <FormActions {...actions} /> : null}
    </form>
  )
}
