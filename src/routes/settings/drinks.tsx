import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Coffee, Milk, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DeleteConfirmation } from '@/components/delete-confirmation'
import { SettingsPanelSection } from '@/components/settings/settings-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  archiveDrinkOptionValue,
  archiveDrinkType,
  createDrinkOptionValue,
  getDrinkConfiguration,
  saveDrinkType,
} from '@/lib/server/drink-options'

export const Route = createFileRoute('/settings/drinks')({
  loader: () => getDrinkConfiguration(),
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
  const router = useRouter()
  const milkGroup = configuration.optionGroups.find(
    (group) => group.name.toLocaleLowerCase() === 'milk',
  )

  const refresh = async () => {
    await router.invalidate()
  }
  const reportError = (error: unknown, fallback: string) =>
    toast.error(error instanceof Error ? error.message : fallback)

  return (
    <>
      <SettingsPanelSection
        title="Drink types"
        description="Choose the finished drinks available on brews and café visits. Enable milk only for types that should ask which milk was used."
        action={<Coffee className="size-5 text-link" aria-hidden="true" />}
      >
        <ul className="divide-y divide-border rounded-xl border border-border">
          {configuration.drinkTypes.map((drinkType) => {
            const usesMilk = milkGroup
              ? drinkType.optionGroupIds.includes(milkGroup.id)
              : false
            return (
              <li
                key={drinkType.id}
                className="flex min-h-14 items-center justify-between gap-4 px-3 py-2"
              >
                <span className="min-w-0 truncate font-medium">
                  {drinkType.name}
                </span>
                <div className="flex shrink-0 items-center gap-4">
                  {milkGroup ? (
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
                            await refresh()
                          } catch (error) {
                            reportError(error, 'Could not update this type')
                          }
                        }}
                      />
                    </div>
                  ) : null}
                  <DeleteConfirmation
                    title={`Remove "${drinkType.name}"?`}
                    description="Existing brews and visits keep this type, but it will no longer be offered for new entries."
                    onConfirm={async () => {
                      await archiveDrinkType({ data: drinkType.id })
                      await refresh()
                    }}
                  />
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
              await refresh()
            } catch (error) {
              reportError(error, 'Could not add this drink type')
            }
          }}
        />
      </SettingsPanelSection>

      {milkGroup ? (
        <SettingsPanelSection
          title="Milk types"
          description="These choices appear whenever the selected drink type uses milk."
          action={<Milk className="size-5 text-link" aria-hidden="true" />}
        >
          <ul className="divide-y divide-border rounded-xl border border-border">
            {milkGroup.values.map((value) => (
              <li
                key={value.id}
                className="flex min-h-14 items-center justify-between gap-3 px-3 py-2"
              >
                <span className="font-medium">{value.name}</span>
                <DeleteConfirmation
                  title={`Remove "${value.name}"?`}
                  description="Existing entries keep this value, but it will no longer be offered for new entries."
                  onConfirm={async () => {
                    await archiveDrinkOptionValue({ data: value.id })
                    await refresh()
                  }}
                />
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
                await refresh()
              } catch (error) {
                reportError(error, 'Could not add this milk type')
              }
            }}
          />
        </SettingsPanelSection>
      ) : null}
    </>
  )
}
