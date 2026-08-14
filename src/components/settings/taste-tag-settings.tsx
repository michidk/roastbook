import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
    <div className="space-y-4">
      <ul className="space-y-1">
        {tags.map((tag) => (
          <li
            key={tag.id}
            className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-1"
          >
            <span className="flex min-w-0 items-center gap-2">
              <Badge
                variant={isNegativeTasteTag(tag) ? 'destructive' : 'default'}
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
        {tags.length === 0 && (
          <li className="px-2 py-1 text-sm text-muted-foreground">
            No taste tags yet.
          </li>
        )}
      </ul>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void handleAdd()
        }}
      >
        <label htmlFor="new-taste-tag" className="sr-only">
          New tag name
        </label>
        <Input
          id="new-taste-tag"
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
          placeholder="e.g., Stone fruit"
          maxLength={50}
        />
        <Button
          type="submit"
          size="sm"
          disabled={isAdding || !newTagName.trim()}
        >
          <Plus />
          {isAdding ? 'Adding…' : 'Add tag'}
        </Button>
      </form>
    </div>
  )
}
