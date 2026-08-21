import { SelectField } from '@/components/form/form-field'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  TASTE_PROFILE_FIELD_META,
  TASTE_PROFILE_MODE_OPTIONS,
  TASTE_PROFILE_SENSORY_FIELDS,
  type TasteProfileConfig,
  type TasteProfileField,
  type TasteProfileMode,
  tasteProfileMode,
} from '@/lib/taste-profile'

type TasteProfileSettingsProps = {
  readonly config: TasteProfileConfig
  readonly disabled?: boolean
  readonly onToggle: (field: TasteProfileField, enabled: boolean) => void
  readonly onModeChange: (mode: TasteProfileMode) => void
}

export function TasteProfileSettings({
  config,
  disabled = false,
  onToggle,
  onModeChange,
}: TasteProfileSettingsProps) {
  const mode = tasteProfileMode(config)

  return (
    <div className="space-y-6">
      <FieldToggle
        field="overallRating"
        config={config}
        disabled={disabled}
        onToggle={onToggle}
      />

      <div className="space-y-4">
        <div className="space-y-2">
          <SelectField
            id="taste-profile-mode"
            label="Sensory detail"
            required
            value={mode}
            disabled={disabled}
            options={TASTE_PROFILE_MODE_OPTIONS}
            onChange={(value) => {
              if (value === 'detailed' || value === 'simple')
                onModeChange(value)
            }}
          />
          <p className="text-sm text-muted-foreground">
            Detailed factors rate each sensation on its own. Simple balance asks
            only where the brew landed between sour and bitter — the usual first
            dial-in move. Switching modes hides the other mode’s values without
            deleting them.
          </p>
        </div>

        {mode === 'simple' ? (
          <FieldToggle
            field="extractionBalance"
            config={config}
            disabled={disabled}
            onToggle={onToggle}
          />
        ) : (
          <fieldset className="min-w-0 space-y-4 border-0 p-0">
            <legend className="text-sm font-bold tracking-[0.14em] text-muted-foreground uppercase">
              Sensory factors
            </legend>
            {TASTE_PROFILE_SENSORY_FIELDS.map((field) => (
              <FieldToggle
                key={field}
                field={field}
                config={config}
                disabled={disabled}
                onToggle={onToggle}
              />
            ))}
          </fieldset>
        )}
      </div>

      <div className="space-y-4">
        <FieldToggle
          field="flavorTags"
          config={config}
          disabled={disabled}
          onToggle={onToggle}
        />
        <FieldToggle
          field="notes"
          config={config}
          disabled={disabled}
          onToggle={onToggle}
        />
      </div>
    </div>
  )
}

function FieldToggle({
  field,
  config,
  disabled,
  onToggle,
}: {
  readonly field: TasteProfileField
  readonly config: TasteProfileConfig
  readonly disabled: boolean
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
