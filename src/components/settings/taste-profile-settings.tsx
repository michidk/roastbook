import { TasteScalePicker } from '@/components/settings/taste-scale-picker'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  TASTE_PROFILE_FIELD_META,
  type TasteProfileConfig,
  type TasteProfileField,
} from '@/lib/taste-profile'

type TasteProfileSettingsProps = {
  readonly config: TasteProfileConfig
  readonly disabled?: boolean
  readonly onToggle: (field: TasteProfileField, enabled: boolean) => void
}

export function TasteProfileSettings({
  config,
  disabled = false,
  onToggle,
}: TasteProfileSettingsProps) {
  return (
    <div className="space-y-5 md:space-y-6">
      <TasteScalePicker
        config={config}
        disabled={disabled}
        onToggle={onToggle}
      />

      <TasteProfileFieldToggle
        field="notes"
        config={config}
        disabled={disabled}
        onToggle={onToggle}
      />
    </div>
  )
}

export function TasteProfileFieldToggle({
  field,
  config,
  disabled = false,
  onToggle,
}: {
  readonly field: TasteProfileField
  readonly config: TasteProfileConfig
  readonly disabled?: boolean
  readonly onToggle: (field: TasteProfileField, enabled: boolean) => void
}) {
  const meta = TASTE_PROFILE_FIELD_META[field]
  const id = `taste-profile-${field}`

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 space-y-1">
        <Label htmlFor={id}>{meta.label}</Label>
        <p className="text-sm text-muted-foreground">{meta.description}</p>
      </div>
      <Switch
        id={id}
        checked={config[field]}
        disabled={disabled}
        onCheckedChange={(checked) => onToggle(field, checked)}
      />
    </div>
  )
}
