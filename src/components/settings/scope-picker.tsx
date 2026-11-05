import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  accessLevelsFromScopes,
  allScopes,
  INTEGRATION_RESOURCES,
  type IntegrationAccessLevel,
  type IntegrationScope,
  scopesFromAccessLevels,
} from '@/modules/integrations/scopes'

const LEVELS = [
  { value: 'none', label: 'None' },
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Read & write' },
] as const satisfies readonly {
  value: IntegrationAccessLevel
  label: string
}[]

/**
 * Per-resource access for API keys, MCP tokens and MCP applications. `allowed`
 * caps the choice, for example to what an OAuth application requested.
 */
export function ScopePicker({
  id,
  value,
  onChange,
  allowed,
  disabled,
}: {
  readonly id: string
  readonly value: readonly IntegrationScope[]
  readonly onChange: (scopes: IntegrationScope[]) => void
  readonly allowed?: readonly IntegrationScope[]
  readonly disabled?: boolean
}) {
  const levels = accessLevelsFromScopes(value)
  const permitted = new Set<string>(allowed ?? allScopes('write'))
  const resources = INTEGRATION_RESOURCES.filter((resource) =>
    permitted.has(`${resource.id}:read`),
  )
  const set = (resource: string, level: IntegrationAccessLevel) =>
    onChange(scopesFromAccessLevels({ ...levels, [resource]: level }))
  const preset = (access: 'read' | 'write' | 'none') =>
    onChange(
      access === 'none'
        ? []
        : allScopes(access).filter((scope) => permitted.has(scope)),
    )

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => preset('read')}
        >
          Read everything
        </Button>
        {resources.some((resource) => permitted.has(`${resource.id}:write`)) ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            onClick={() => preset('write')}
          >
            Full access
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={disabled}
          onClick={() => preset('none')}
        >
          Clear
        </Button>
      </div>
      <div className="divide-y divide-border rounded-xl border border-border">
        {resources.map((resource) => {
          const options = LEVELS.filter(
            (level) =>
              level.value === 'none' ||
              permitted.has(`${resource.id}:${level.value}`),
          )
          return (
            <fieldset
              key={resource.id}
              aria-describedby={`${id}-${resource.id}-description`}
              className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <legend className="sr-only">{resource.label}</legend>
              <div className="min-w-0">
                {/* The legend names the group for screen readers. */}
                <p aria-hidden="true" className="text-sm font-medium">
                  {resource.label}
                </p>
                <p
                  id={`${id}-${resource.id}-description`}
                  className="text-xs text-muted-foreground"
                >
                  {resource.description}
                </p>
              </div>
              <div className="flex shrink-0 rounded-lg border border-border p-0.5">
                {options.map((level) => {
                  const inputId = `${id}-${resource.id}-${level.value}`
                  const checked = levels[resource.id] === level.value
                  return (
                    <label
                      key={level.value}
                      htmlFor={inputId}
                      className={cn(
                        'flex min-h-9 flex-1 cursor-pointer items-center justify-center rounded-md px-3 text-xs font-medium whitespace-nowrap transition-colors pointer-coarse:min-h-11',
                        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                        checked
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-muted',
                        disabled && 'cursor-not-allowed opacity-60',
                      )}
                    >
                      <input
                        id={inputId}
                        type="radio"
                        name={`${id}-${resource.id}`}
                        value={level.value}
                        checked={checked}
                        disabled={disabled}
                        onChange={() => set(resource.id, level.value)}
                        className="sr-only"
                      />
                      {level.label}
                    </label>
                  )
                })}
              </div>
            </fieldset>
          )
        })}
      </div>
    </div>
  )
}
