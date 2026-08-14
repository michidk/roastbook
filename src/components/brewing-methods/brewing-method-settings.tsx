import { useRouter } from '@tanstack/react-router'
import { ChevronDown, Plus, Save, Timer } from 'lucide-react'
import { type SyntheticEvent, useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/DeleteConfirmation'
import { InputField, TextareaField } from '@/components/form/form-field'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Toggle } from '@/components/ui/toggle'
import {
  createBrewingMethod,
  deleteBrewingMethod,
  type getBrewingMethods,
  updateBrewingMethod,
} from '@/lib/server/brewing-methods'
import {
  SHOT_PARAMETER_KEYS,
  SHOT_PARAMETER_META,
  type ShotParameterKey,
} from '@/lib/shot-parameters'
import { cn } from '@/lib/utils'

type BrewingMethod = Awaited<ReturnType<typeof getBrewingMethods>>[number]

export function BrewingMethodSettings({
  methods,
}: {
  readonly methods: readonly BrewingMethod[]
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!name.trim()) return
    setIsCreating(true)
    try {
      await createBrewingMethod({
        data: { name, description, enabledParameters: [], timerEnabled: false },
      })
      setName('')
      setDescription('')
      await router.invalidate()
      toast.success('Brewing method created')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not create brewing method',
      )
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleCreate}
        className="space-y-3 rounded-xl bg-secondary p-4"
      >
        <InputField
          id="new-brewing-method"
          label="New method"
          value={name}
          onChange={setName}
          placeholder="Chemex"
          required
        />
        <TextareaField
          id="new-brewing-method-description"
          label="Description"
          value={description}
          onChange={setDescription}
          placeholder="How this method brews coffee"
          rows={2}
        />
        <Button type="submit" disabled={!name.trim() || isCreating}>
          <Plus />
          {isCreating ? 'Creating…' : 'Create method'}
        </Button>
      </form>

      {methods.map((method) => (
        <BrewingMethodEditor key={method.id} method={method} />
      ))}
    </div>
  )
}

function BrewingMethodEditor({ method }: { readonly method: BrewingMethod }) {
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
    <Collapsible>
      <Card size="sm">
        <CardHeader>
          <CollapsibleTrigger className="group flex min-h-11 flex-1 items-center justify-between gap-3 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <div>
              <CardTitle as="h2">{method.name}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {method.description ?? 'No description'}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {enabledParameters.length} logging field
                {enabledParameters.length === 1 ? '' : 's'}
              </p>
            </div>
            <ChevronDown className="transition-transform group-data-[open]:rotate-180 motion-reduce:transition-none" />
          </CollapsibleTrigger>
          <CardAction>
            <DeleteConfirmation
              title={`Delete ${method.name}?`}
              description="Methods used by brews or recipes cannot be deleted."
              onConfirm={async () => {
                await deleteBrewingMethod({ data: method.id })
                await router.invalidate()
                toast.success('Brewing method deleted')
              }}
            />
          </CardAction>
        </CardHeader>
        <CollapsibleContent>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
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
              <div className="space-y-2">
                <p className="text-sm font-medium">Logging tools</p>
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
                <p className="text-sm text-muted-foreground">
                  The timer records into Brew time and is available only when
                  that field is shown.
                </p>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">
                    Fields shown when logging
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Choose which details can be recorded for brews and recipes
                    using this method.
                  </p>
                </div>
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
              </div>
              <Button type="submit" disabled={!name.trim() || isSaving}>
                <Save />
                {isSaving ? 'Saving…' : 'Save method'}
              </Button>
            </form>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
