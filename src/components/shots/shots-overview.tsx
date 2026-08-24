import { ListTree } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ShotsViewToggleProps = {
  readonly grouped: boolean
  readonly onGroupedChange: (grouped: boolean) => void
}

export function ShotsViewToggle({
  grouped,
  onGroupedChange,
}: ShotsViewToggleProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={grouped ? 'primary' : 'outline'}
      className="sm:h-11"
      aria-pressed={grouped}
      onClick={() => onGroupedChange(!grouped)}
    >
      <ListTree aria-hidden="true" />
      Group by bean
    </Button>
  )
}
