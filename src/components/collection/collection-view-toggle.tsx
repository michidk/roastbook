import { LayoutGrid, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CollectionView } from '@/lib/collection-view'

const VIEW_BUTTONS = [
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'table', label: 'Table', icon: Table2 },
] as const satisfies readonly {
  readonly value: CollectionView
  readonly label: string
  readonly icon: typeof LayoutGrid
}[]

type CollectionViewToggleProps = {
  readonly value: CollectionView
  readonly onValueChange: (view: CollectionView) => void
  readonly disabled?: boolean
  readonly label?: string
}

export function CollectionViewToggle({
  value,
  onValueChange,
  disabled = false,
  label = 'List view',
}: CollectionViewToggleProps) {
  return (
    <fieldset className="flex gap-2" disabled={disabled}>
      <legend className="sr-only">{label}</legend>
      {VIEW_BUTTONS.map(({ value: view, label: viewLabel, icon: Icon }) => (
        <Button
          key={view}
          type="button"
          size="sm"
          variant={value === view ? 'primary' : 'secondary'}
          aria-pressed={value === view}
          onClick={() => onValueChange(view)}
        >
          <Icon aria-hidden />
          {viewLabel}
        </Button>
      ))}
    </fieldset>
  )
}
