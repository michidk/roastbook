import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createTasteTag, deleteTasteTag } from '@/lib/server/taste-tags'
import { isNegativeTasteTag } from '@/lib/taste-tags'

type TasteTag = {
  readonly id: number
  readonly name: string
  readonly category: string | null
  readonly llmInstruction: string
}

export function TasteTagSettings({
  tags,
  onChanged,
}: {
  readonly tags: readonly TasteTag[]
  readonly onChanged: () => void
}) {
  const [newTagName, setNewTagName] = useState('')
  const [newTagInstruction, setNewTagInstruction] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    const name = newTagName.trim()
    const llmInstruction = newTagInstruction.trim()
    if (!name || !llmInstruction) return
    setIsAdding(true)
    try {
      await createTasteTag({ data: { name, llmInstruction } })
      setNewTagName('')
      setNewTagInstruction('')
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
              {tag.llmInstruction ? (
                <span className="truncate text-xs text-muted-foreground">
                  {tag.llmInstruction}
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
        className="grid gap-2 sm:grid-cols-[minmax(10rem,0.65fr)_minmax(16rem,1.35fr)_auto] sm:items-start"
        onSubmit={(event) => {
          event.preventDefault()
          void handleAdd()
        }}
      >
        <label htmlFor="new-taste-tag-label" className="sr-only">
          Tag label
        </label>
        <Input
          id="new-taste-tag-label"
          value={newTagName}
          onChange={(event) => setNewTagName(event.target.value)}
          placeholder="Label, e.g. Stone fruit"
          maxLength={50}
        />
        <label htmlFor="new-taste-tag-instruction" className="sr-only">
          LLM instruction
        </label>
        <Textarea
          id="new-taste-tag-instruction"
          value={newTagInstruction}
          onChange={(event) => setNewTagInstruction(event.target.value)}
          placeholder="LLM instruction for interpreting this tag"
          maxLength={1000}
          rows={2}
          className="min-h-11 resize-y"
        />
        <Button
          type="submit"
          size="sm"
          className="min-h-11"
          disabled={isAdding || !newTagName.trim() || !newTagInstruction.trim()}
        >
          <Plus />
          {isAdding ? 'Adding…' : 'Add tag'}
        </Button>
      </form>
    </div>
  )
}
