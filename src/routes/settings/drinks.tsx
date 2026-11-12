import { Button } from '@roastbook/ui/button'
import { Input } from '@roastbook/ui/input'
import { Label } from '@roastbook/ui/label'
import { Switch } from '@roastbook/ui/switch'
import { createFileRoute } from '@tanstack/react-router'
import { Coffee, Milk, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { PanelPending } from '@/components/route-pending'
import { PanelSection } from '@/components/section-layout'
import {
  EnableButton,
  RemoveOrDisable,
} from '@/components/settings/built-in-item-actions'
import {
  archiveDrinkOptionValue,
  archiveDrinkType,
  createDrinkOptionValue,
  getDrinkSettings,
  restoreDrinkOptionValue,
  restoreDrinkType,
  saveDrinkType,
} from '@/journal/drink-options'

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
        description="Choose the finished drinks available on brews and café visits. Enable milk only for types that should ask which milk was used."
        action={<Coffee className="size-5 text-link" aria-hidden="true" />}
      >
        <ul className="max-h-96 divide-y divide-border overflow-y-auto overscroll-contain rounded-xl border border-border">
          {[...configuration.drinkTypes]
            .sort((a, b) => Number(a.isArchived) - Number(b.isArchived))
            .map((drinkType) => {
              const usesMilk = milkGroup
                ? drinkType.optionGroupIds.includes(milkGroup.id)
                : false
              return (
                <li
                  key={drinkType.id}
                  className={`flex min-h-14 items-center justify-between gap-4 px-3 py-2 ${drinkType.isArchived ? 'bg-muted text-muted-foreground' : ''}`}
                >
                  <span className="min-w-0 truncate font-medium">
                    {drinkType.name}
                  </span>
                  <div className="flex shrink-0 items-center gap-4">
                    {milkGroup && !drinkType.isArchived ? (
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`drink-milk-${drinkType.id}`}>
                          Uses milk
                        </Label>
                        <Switch
                          id={`drink-milk-${drinkType.id}`}
                          checked={usesMilk}
                          onCheckedChange={async (enabled) => {
                            const optionGroupIds = enabled
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
                      </div>
                    ) : null}
                    {drinkType.isArchived ? (
                      <EnableButton
                        onClick={async () => {
                          try {
                            await restoreDrinkType({ data: drinkType.id })
                          } catch (error) {
                            reportError(error, 'Could not enable this type')
                          }
                        }}
                      />
                    ) : (
                      <RemoveOrDisable
                        name={drinkType.name}
                        isBuiltIn={drinkType.isBuiltIn}
                        onRemove={async () => {
                          await archiveDrinkType({ data: drinkType.id })
                        }}
                      />
                    )}
                  </div>
                </li>
              )
            })}
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
                  className={`flex min-h-14 items-center justify-between gap-3 px-3 py-2 ${value.isArchived ? 'bg-muted text-muted-foreground' : ''}`}
                >
                  <span className="font-medium">{value.name}</span>
                  {value.isArchived ? (
                    <EnableButton
                      onClick={async () => {
                        try {
                          await restoreDrinkOptionValue({ data: value.id })
                        } catch (error) {
                          reportError(error, 'Could not enable this milk type')
                        }
                      }}
                    />
                  ) : (
                    <RemoveOrDisable
                      name={value.name}
                      isBuiltIn={value.isBuiltIn}
                      onRemove={async () => {
                        await archiveDrinkOptionValue({ data: value.id })
                      }}
                    />
                  )}
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
