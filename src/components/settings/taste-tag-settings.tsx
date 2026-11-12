import { Badge } from '@roastbook/ui/badge'
import { Button } from '@roastbook/ui/button'
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@roastbook/ui/dialog'
import { Input } from '@roastbook/ui/input'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ItemAvailability } from '@/components/settings/built-in-item-actions'
import {
  createTasteTag,
  deleteTasteTag,
  disableTasteTag,
  enableTasteTag,
} from '@/journal/taste-tags'
import {
  isNegativeTasteTag,
  SCA_FLAVOR_WHEEL,
  scaFlavorCategory,
} from '@/lib/taste-tags'

type TasteTag = {
  readonly id: number
  readonly name: string
  readonly category: string | null
  readonly hint: string | null
  readonly isArchived: boolean
}

/** SCA categories in wheel order, then custom tags, then disabled tags. */
function groupTasteTags(tags: readonly TasteTag[]) {
  const active = tags.filter((tag) => !tag.isArchived)
  return [
    ...Object.keys(SCA_FLAVOR_WHEEL).map((category) => ({
      title: category,
      tags: active.filter((tag) => scaFlavorCategory(tag.name) === category),
    })),
    {
      title: 'Custom',
      tags: active.filter((tag) => !scaFlavorCategory(tag.name)),
    },
    { title: 'Disabled', tags: tags.filter((tag) => tag.isArchived) },
  ].filter((group) => group.tags.length > 0)
}

export function TasteTagSettings({
  tags,
}: {
  readonly tags: readonly TasteTag[]
}) {
  const [newTagName, setNewTagName] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const enabledCount = tags.filter((tag) => !tag.isArchived).length
  const reportError = (error: unknown, fallback: string) =>
    toast.error(error instanceof Error ? error.message : fallback)

  const handleAdd = async () => {
    const name = newTagName.trim()
    if (!name) return
    setIsAdding(true)
    try {
      await createTasteTag({ data: { name } })
      setNewTagName('')
      toast.success(`Added "${name}"`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not add this tag',
      )
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Dialog>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {enabledCount === 0
            ? 'No taste tags enabled.'
            : `${enabledCount} taste ${enabledCount === 1 ? 'tag' : 'tags'} enabled.`}
        </p>
        <DialogTrigger render={<Button type="button" variant="outline" />}>
          Manage taste tags
        </DialogTrigger>
      </div>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage taste tags</DialogTitle>
          <DialogDescription>
            Built-in tags follow the SCA Coffee Taster's Flavor Wheel. Switch
            off the ones you don't use, or add and delete your own custom tags.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {tags.length === 0 ? (
            <p className="px-2 py-1 text-sm text-muted-foreground">
              No taste tags yet. Add your first tag below.
            </p>
          ) : null}
          <div className="space-y-4">
            {groupTasteTags(tags).map((group) => (
              <section
                key={group.title}
                aria-labelledby={`taste-group-${group.title}`}
              >
                <h3
                  id={`taste-group-${group.title}`}
                  className="mb-1 px-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
                >
                  {group.title}
                </h3>
                <ul className="space-y-1">
                  {group.tags.map((tag) => (
                    <li
                      key={tag.id}
                      className={`flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-1 ${tag.isArchived ? 'bg-muted text-muted-foreground' : ''}`}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Badge
                          variant={
                            tag.isArchived
                              ? 'outline'
                              : isNegativeTasteTag(tag)
                                ? 'destructive'
                                : 'default'
                          }
                        >
                          {tag.name}
                        </Badge>
                        {tag.hint ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {tag.hint}
                          </span>
                        ) : null}
                      </span>
                      <div className="flex w-12 shrink-0 justify-center">
                        <ItemAvailability
                          name={tag.name}
                          isBuiltIn={scaFlavorCategory(tag.name) !== undefined}
                          enabled={!tag.isArchived}
                          onEnabledChange={async (enabled) => {
                            try {
                              await (enabled
                                ? enableTasteTag
                                : disableTasteTag)({ data: tag.id })
                            } catch (error) {
                              reportError(error, 'Could not update this tag')
                            }
                          }}
                          deleteDescription="This removes the tag from every brew and café visit that uses it. This action cannot be undone."
                          onDelete={async () => {
                            await deleteTasteTag({ data: tag.id })
                          }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogBody>
        <DialogFooter className="sm:items-end sm:justify-between">
          <DialogClose render={<Button type="button" variant="outline" />}>
            Close
          </DialogClose>
          <form
            className="flex w-full flex-col gap-2 sm:max-w-sm sm:flex-row sm:items-end"
            onSubmit={(event) => {
              event.preventDefault()
              void handleAdd()
            }}
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="new-taste-tag"
                className="mb-1.5 block text-sm font-medium"
              >
                New tag name
              </label>
              <Input
                id="new-taste-tag"
                value={newTagName}
                onChange={(event) => setNewTagName(event.target.value)}
                placeholder="e.g., Stone fruit"
                maxLength={50}
              />
            </div>
            <Button type="submit" disabled={isAdding || !newTagName.trim()}>
              <Plus />
              {isAdding ? 'Adding…' : 'Add tag'}
            </Button>
          </form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
