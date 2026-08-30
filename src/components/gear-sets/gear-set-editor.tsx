import { useRouter } from '@tanstack/react-router'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { GearSetFields } from '@/components/gear-sets/gear-set-fields'
import {
  gearSetFormValuesFrom,
  gearSetWritePayload,
} from '@/components/gear-sets/gear-set-form-values'
import { Button } from '@/components/ui/button'
import { useFormState } from '@/hooks/use-form-state'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { type getGearSetById, updateGearSet } from '@/lib/server/gear-sets'
import type { GearOption } from '@/modules/brews/shot-form-values'

type GearSet = NonNullable<Awaited<ReturnType<typeof getGearSetById>>>

type GearSetEditorProps = {
  readonly gearSet: GearSet
  readonly gear: readonly GearOption[]
}

export function GearSetEditor({ gearSet, gear }: GearSetEditorProps) {
  const router = useRouter()
  const { values, set } = useFormState(() => gearSetFormValuesFrom(gearSet))
  const { isSubmitting, handleSubmit } = useFormSubmission({
    canSubmit: () => Boolean(values.name.trim()),
    submit: async () => {
      await updateGearSet({
        data: { id: gearSet.id, ...gearSetWritePayload(values) },
      })
      await router.invalidate()
      toast.success(`${values.name.trim()} saved`)
    },
    onError: (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Could not save gear set',
      ),
  })

  return (
    <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
      <GearSetFields
        idPrefix={`gear-set-${gearSet.id}`}
        values={values}
        gear={gear}
        onChange={set}
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={!values.name.trim() || isSubmitting}>
          <Save />
          {isSubmitting ? 'Saving…' : 'Save gear set'}
        </Button>
      </div>
    </form>
  )
}
