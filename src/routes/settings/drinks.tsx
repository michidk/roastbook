import { Button } from '@roastbook/ui/button'
import { Input } from '@roastbook/ui/input'
import { Label } from '@roastbook/ui/label'
import { Toggle } from '@roastbook/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@roastbook/ui/tooltip'
import { createFileRoute } from '@tanstack/react-router'
import { Coffee, Milk, MilkOff, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PanelPending } from '@/components/route-pending'
import { PanelSection } from '@/components/section-layout'
import { ItemAvailability } from '@/components/settings/built-in-item-actions'
import {
  archiveDrinkOptionValue,
  archiveDrinkType,
  createDrinkOptionValue,
  getDrinkSettings,
  restoreDrinkOptionValue,
  restoreDrinkType,
  saveDrinkType,
} from '@/journal/drink-options'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/settings/drinks')({
  pendingComponent: PanelPending,
  loader: () => getDrinkSettings(),
  component: DrinkSettings,
})

function AddItemForm({
  id,
  label,
  placeholder,
  onAdd,
}: {
  readonly id: string
  readonly label: string
  readonly placeholder: string
  readonly onAdd: (name: string) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  return (
    <form
      className="flex items-end gap-2"
      onSubmit={async (event) => {
        event.preventDefault()
        const nextName = name.trim()
        if (!nextName) return
        setIsSaving(true)
        try {
          await onAdd(nextName)
          setName('')
        } finally {
          setIsSaving(false)
        }
      }}
    >
      <div className="min-w-0 flex-1 space-y-2">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={placeholder}
          maxLength={100}
        />
      </div>
      <Button type="submit" disabled={isSaving || !name.trim()}>
        <Plus />
        Add
      </Button>
    </form>
  )
}

function MilkToggle({
  name,
  pressed,
  onPressedChange,
}: {
  readonly name: string
  readonly pressed: boolean
  readonly onPressedChange: (pressed: boolean) => void
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Toggle
            size="touch"
            aria-label={`${name} uses milk`}
            pressed={pressed}
            onPressedChange={onPressedChange}
            className="px-0 text-muted-foreground aria-pressed:text-link"
          />
        }
      >
        {pressed ? (
          <Milk aria-hidden="true" className="size-5" />
        ) : (
          <MilkOff aria-hidden="true" className="size-5" />
        )}
      </TooltipTrigger>
      <TooltipContent>
        {pressed
          ? `Uses milk: brews and visits with ${name} ask which milk was used.`
          : `No milk: turn on to ask which milk was used for ${name}.`}
      </TooltipContent>
    </Tooltip>
  )
}

function DrinkSettings() {
  const configuration = Route.useLoaderData()
  const milkGroup = configuration.optionGroups.find(
    (group) => group.name.toLocaleLowerCase() === 'milk',
  )

  const reportError = (error: unknown, fallback: string) =>
    toast.error(error instanceof Error ? error.message : fallback)

  return (
    <>
      <PanelSection
        title="Drink types"
        description="Choose the finished drinks available on brews and café visits. Turn on the milk icon for types that should ask which milk was used."
        action={<Coffee className="size-5 text-link" aria-hidden="true" />}
      >
        <ul className="max-h-96 divide-y divide-border overflow-y-auto overscroll-contain rounded-xl border border-border">
          {[...configuration.drinkTypes]
            .sort((a, b) => Number(a.isArchived) - Number(b.isArchived))
            .map((drinkType) => (
              <li
                key={drinkType.id}
                className={cn(
                  'flex min-h-14 items-center justify-between gap-4 px-3 py-2',
                  drinkType.isArchived && 'bg-muted text-muted-foreground',
                )}
              >
                <span className="min-w-0 truncate font-medium">
                  {drinkType.name}
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {milkGroup ? (
                    <MilkToggle
                      name={drinkType.name}
                      pressed={drinkType.optionGroupIds.includes(milkGroup.id)}
                      onPressedChange={async (usesMilk) => {
                        const optionGroupIds = usesMilk
                          ? [...drinkType.optionGroupIds, milkGroup.id]
                          : drinkType.optionGroupIds.filter(
                              (id) => id !== milkGroup.id,
                            )
                        try {
                          await saveDrinkType({
                            data: {
                              id: drinkType.id,
                              name: drinkType.name,
                              optionGroupIds,
                            },
                          })
                        } catch (error) {
                          reportError(error, 'Could not update this type')
                        }
                      }}
                    />
                  ) : null}
                  <div className="flex w-12 justify-center">
                    <ItemAvailability
                      name={drinkType.name}
                      isBuiltIn={drinkType.isBuiltIn}
                      enabled={!drinkType.isArchived}
                      onEnabledChange={async (enabled) => {
                        try {
                          await (enabled ? restoreDrinkType : archiveDrinkType)(
                            { data: drinkType.id },
                          )
                        } catch (error) {
                          reportError(error, 'Could not update this type')
                        }
                      }}
                      onDelete={async () => {
                        await archiveDrinkType({ data: drinkType.id })
                      }}
                    />
                  </div>
                </div>
              </li>
            ))}
        </ul>
        <AddItemForm
          id="new-drink-type"
          label="New drink type"
          placeholder="e.g., Piccolo"
          onAdd={async (name) => {
            try {
              await saveDrinkType({ data: { name, optionGroupIds: [] } })
            } catch (error) {
              reportError(error, 'Could not add this drink type')
            }
          }}
        />
      </PanelSection>

      {milkGroup ? (
        <PanelSection
          title="Milk types"
          description="These choices appear whenever the selected drink type uses milk."
          action={<Milk className="size-5 text-link" aria-hidden="true" />}
        >
          <ul className="max-h-96 divide-y divide-border overflow-y-auto overscroll-contain rounded-xl border border-border">
            {[...milkGroup.values]
              .sort((a, b) => Number(a.isArchived) - Number(b.isArchived))
              .map((value) => (
                <li
                  key={value.id}
                  className={cn(
                    'flex min-h-14 items-center justify-between gap-3 px-3 py-2',
                    value.isArchived && 'bg-muted text-muted-foreground',
                  )}
                >
                  <span className="font-medium">{value.name}</span>
                  <div className="flex w-12 shrink-0 justify-center">
                    <ItemAvailability
                      name={value.name}
                      isBuiltIn={value.isBuiltIn}
                      enabled={!value.isArchived}
                      onEnabledChange={async (enabled) => {
                        try {
                          await (enabled
                            ? restoreDrinkOptionValue
                            : archiveDrinkOptionValue)({ data: value.id })
                        } catch (error) {
                          reportError(error, 'Could not update this milk type')
                        }
                      }}
                      onDelete={async () => {
                        await archiveDrinkOptionValue({ data: value.id })
                      }}
                    />
                  </div>
                </li>
              ))}
          </ul>
          <AddItemForm
            id="new-milk-type"
            label="New milk type"
            placeholder="e.g., Pea milk"
            onAdd={async (name) => {
              try {
                await createDrinkOptionValue({
                  data: { groupId: milkGroup.id, name },
                })
              } catch (error) {
                reportError(error, 'Could not add this milk type')
              }
            }}
          />
        </PanelSection>
      ) : null}
    </>
  )
}
