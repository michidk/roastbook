import { ArrowRight, Store } from 'lucide-react'
import { RoasterForm } from '@/components/roasters/roaster-form'
import type { RoasterFormValues } from '@/components/roasters/roaster-form-values'
import type { RoasterOption } from '@/components/roasters/roaster-picker'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ExtractedBeanInfo } from '@/lib/ai'
import { findRoasterByName } from '@/lib/roaster-match'

export function roasterDetailsFromExtraction(
  extracted: ExtractedBeanInfo,
): Partial<RoasterFormValues> {
  return {
    ...(extracted.roasterLocation
      ? { location: extracted.roasterLocation }
      : undefined),
    ...(extracted.roasterCountry
      ? { country: extracted.roasterCountry }
      : undefined),
    ...(extracted.roasterWebsite
      ? { website: extracted.roasterWebsite }
      : undefined),
    ...(extracted.roasterInstagramHandle
      ? { instagramHandle: extracted.roasterInstagramHandle }
      : undefined),
  }
}

export function ExtractedRoasterDialog({
  currentRoasterId,
  onCreated,
  onOpenChange,
  onSelect,
  open,
  roasters,
  suggestedDetails,
  suggestedName,
}: {
  readonly currentRoasterId: string
  readonly onCreated: (roaster: RoasterOption) => void | Promise<void>
  readonly onOpenChange: (open: boolean) => void
  readonly onSelect: (roaster: RoasterOption) => void
  readonly open: boolean
  readonly roasters: readonly RoasterOption[]
  readonly suggestedDetails?: Partial<RoasterFormValues>
  readonly suggestedName: string
}) {
  const matchedRoaster = findRoasterByName(roasters, suggestedName)
  const currentRoaster = roasters.find(
    (roaster) => String(roaster.id) === currentRoasterId,
  )

  if (!matchedRoaster) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-background sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create extracted roaster</DialogTitle>
            <DialogDescription>
              AI identified “{suggestedName}”, and no matching roaster exists in
              Roastbook. Review the details, then create and link it to this
              coffee.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <RoasterForm
              initialName={suggestedName}
              initialValues={suggestedDetails}
              submitLabel="Create and link roaster"
              onCreated={onCreated}
              onCancel={() => onOpenChange(false)}
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    )
  }

  const alreadySelected = currentRoasterId === String(matchedRoaster.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {alreadySelected
              ? 'Roaster already linked'
              : 'Link existing roaster'}
          </DialogTitle>
          <DialogDescription>
            {alreadySelected
              ? `This coffee already uses ${matchedRoaster.name}. No changes are needed.`
              : `AI identified “${suggestedName}”, which matches an existing roaster. Confirm linking this coffee to it.`}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex items-center gap-3 rounded-xl border bg-card p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <Store className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              {currentRoaster && !alreadySelected ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="truncate line-through">
                    {currentRoaster.name}
                  </span>
                  <ArrowRight className="size-3 shrink-0" />
                </div>
              ) : null}
              <p className="truncate font-semibold">{matchedRoaster.name}</p>
              {[matchedRoaster.location, matchedRoaster.country]
                .filter(Boolean)
                .join(', ') ? (
                <p className="truncate text-sm text-muted-foreground">
                  {[matchedRoaster.location, matchedRoaster.country]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              ) : null}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {alreadySelected ? 'Close' : 'Not now'}
          </Button>
          {!alreadySelected ? (
            <Button
              onClick={() => {
                onSelect(matchedRoaster)
                onOpenChange(false)
              }}
            >
              Link roaster
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
