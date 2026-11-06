import { Button } from '@roastbook/ui/button'
import { useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { InputField } from '@/components/form/form-field'
import {
  createBeanTag,
  deleteBeanTag,
  type getBeanTags,
  updateBeanTag,
} from '@/journal/bean-tags'
import { getErrorMessage } from '@/lib/error-message'

type Tag = Awaited<ReturnType<typeof getBeanTags>>[number]
export function BeanTagSettings({ tags }: { tags: readonly Tag[] }) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {tags.map((tag) => (
          <TagRow key={tag.id} tag={tag} />
        ))}
      </ul>
      {!tags.length ? (
        <p className="text-sm text-muted-foreground">
          No bean tags. Add one below.
        </p>
      ) : null}
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={async (event) => {
          event.preventDefault()
          if (!name.trim()) return
          setSaving(true)
          try {
            await createBeanTag({ data: { name } })
            setName('')
          } catch (error) {
            toast.error(getErrorMessage(error, 'Could not create tag'))
          } finally {
            setSaving(false)
          }
        }}
      >
        <InputField
          id="new-bean-tag"
          label="New bean tag"
          value={name}
          onChange={setName}
          placeholder="e.g., Reorder"
          className="flex-1"
        />
        <Button type="submit" disabled={saving || !name.trim()}>
          {saving ? 'Adding…' : 'Add tag'}
        </Button>
      </form>
    </div>
  )
}

function TagRow({ tag }: { tag: Tag }) {
  const [name, setName] = useState(tag.name)
  const [saving, setSaving] = useState(false)
  return (
    <li>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (event) => {
          event.preventDefault()
          setSaving(true)
          try {
            await updateBeanTag({ data: { id: tag.id, name } })
          } catch (error) {
            toast.error(getErrorMessage(error, 'Could not rename tag'))
          } finally {
            setSaving(false)
          }
        }}
      >
        <InputField
          id={`bean-tag-${tag.id}`}
          label="Tag name"
          value={name}
          onChange={setName}
          className="min-w-0 flex-1"
        />
        <Button
          type="submit"
          variant="outline"
          disabled={saving || !name.trim() || name.trim() === tag.name}
        >
          Save
        </Button>
        <DeleteConfirmation
          title={`Delete “${tag.name}”?`}
          description="This removes the tag from your coffees. Your coffees and history are kept."
          onConfirm={() => deleteBeanTag({ data: tag.id })}
        />
      </form>
    </li>
  )
}
