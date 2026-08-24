import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { createTasteTag, deleteTasteTag } from '@/lib/server/taste-tags'
import { isNegativeTasteTag } from '@/lib/taste-tags'

type TasteTag = {
  readonly id: number
  readonly name: string
  readonly category: string | null
  readonly hint: string | null
}

export function TasteTagSettings({
  tags,
  onChanged,
}: {
  readonly tags: readonly TasteTag[]
  readonly onChanged: () => void
}) {
  const [newTagName, setNewTagName] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    const name = newTagName.trim()
    if (!name) return
    setIsAdding(true)
    try {
      await createTasteTag({ data: { name } })
      setNewTagName('')
      onChanged()
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
          {tags.length === 0
            ? 'No taste tags configured.'
            : `${tags.length} taste ${tags.length === 1 ? 'tag' : 'tags'} configured.`}
        </p>
        <DialogTrigger render={<Button type="button" variant="outline" />}>
          Manage taste tags
        </DialogTrigger>
      </div>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage taste tags</DialogTitle>
          <DialogDescription>
            Add tags offered when rating shots and café visits, or remove tags
            you no longer use.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ul className="space-y-1">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-1"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Badge
                    variant={
                      isNegativeTasteTag(tag) ? 'destructive' : 'default'
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
                <DeleteConfirmation
                  title={`Delete the "${tag.name}" tag?`}
                  description="This removes the tag from every shot and café visit that uses it. This action cannot be undone."
                  onConfirm={async () => {
                    await deleteTasteTag({ data: tag.id })
                    onChanged()
                  }}
                />
              </li>
            ))}
            {tags.length === 0 ? (
              <li className="px-2 py-1 text-sm text-muted-foreground">
                No taste tags yet. Add your first tag below.
              </li>
            ) : null}
          </ul>
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
