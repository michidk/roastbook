import { useRouter } from '@tanstack/react-router'
import { Save, Timer } from 'lucide-react'
import { type SyntheticEvent, useState } from 'react'
import { toast } from 'sonner'
import { InputField, TextareaField } from '@/components/form/form-field'
import { FormSection } from '@/components/form/form-shell'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import {
  type getBrewingMethod,
  updateBrewingMethod,
} from '@/lib/server/brewing-methods'
import {
  SHOT_PARAMETER_KEYS,
  SHOT_PARAMETER_META,
  type ShotParameterKey,
} from '@/lib/shot-parameters'
import { cn } from '@/lib/utils'

type BrewingMethod = NonNullable<Awaited<ReturnType<typeof getBrewingMethod>>>

export function BrewingMethodEditor({
  method,
}: {
  readonly method: BrewingMethod
}) {
  const router = useRouter()
  const [name, setName] = useState(method.name)
  const [description, setDescription] = useState(method.description ?? '')
  const [enabledParameters, setEnabledParameters] = useState<
    readonly ShotParameterKey[]
  >(() =>
    SHOT_PARAMETER_KEYS.filter((key) => method.enabledParameters.includes(key)),
  )
  const [timerEnabled, setTimerEnabled] = useState(method.timerEnabled)
  const [isSaving, setIsSaving] = useState(false)

  const toggle = (key: ShotParameterKey, pressed: boolean) => {
    if (key === 'shotTimeSeconds' && !pressed) setTimerEnabled(false)
    setEnabledParameters((current) =>
      pressed ? [...current, key] : current.filter((item) => item !== key),
    )
  }

  const handleSave = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSaving(true)
    try {
      await updateBrewingMethod({
        data: {
          id: method.id,
          name,
          description,
          enabledParameters,
          timerEnabled,
        },
      })
      await router.invalidate()
      toast.success(`${name.trim()} saved`)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not save brewing method',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <FormSection title="Method">
        <InputField
          id={`brewing-method-${method.id}`}
          label="Name"
          value={name}
          onChange={setName}
          required
        />
        <TextareaField
          id={`brewing-method-description-${method.id}`}
          label="Description"
          value={description}
          onChange={setDescription}
          rows={3}
        />
      </FormSection>

      <FormSection
        title="Logging tools"
        description="The timer records into Brew time and is available only when that field is shown."
      >
        <Toggle
          variant="outline"
          size="lg"
          pressed={timerEnabled}
          disabled={!enabledParameters.includes('shotTimeSeconds')}
          onPressedChange={setTimerEnabled}
          className="h-auto min-h-11 justify-start gap-2 px-3 py-2"
        >
          <Timer />
          Show timer while logging
        </Toggle>
      </FormSection>

      <FormSection
        title="Fields shown when logging"
        description="Choose which details can be recorded for shots and recipes using this method."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          {SHOT_PARAMETER_KEYS.map((key) => {
            const meta = SHOT_PARAMETER_META[key]
            const isEnabled = enabledParameters.includes(key)
            return (
              <Toggle
                key={key}
                variant="outline"
                size="lg"
                pressed={isEnabled}
                onPressedChange={(pressed) => toggle(key, pressed)}
                className={cn(
                  'h-auto min-h-11 justify-between px-3 py-2',
                  isEnabled &&
                    'aria-pressed:border-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground hover:aria-pressed:bg-primary/90 hover:aria-pressed:text-primary-foreground',
                )}
              >
                <span>{meta.label}</span>
                <span
                  className={cn(
                    'text-xs text-muted-foreground',
                    isEnabled && 'text-primary-foreground',
                  )}
                >
                  {meta.group}
                </span>
              </Toggle>
            )
          })}
        </div>
      </FormSection>

      <div className="flex justify-end">
        <Button type="submit" disabled={!name.trim() || isSaving}>
          <Save />
          {isSaving ? 'Saving…' : 'Save method'}
        </Button>
      </div>
    </form>
  )
}
