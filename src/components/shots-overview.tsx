import { ListTree } from "lucide-react"
import { Button } from "@/components/ui/button"

type GroupableShot = {
  readonly createdAt: Date
  readonly bean: {
    readonly id: number
    readonly name: string
  } | null
}

type ShotGroup<Shot extends GroupableShot> = {
  readonly key: string
  readonly bean: Shot["bean"]
  readonly label: string
  readonly shots: Shot[]
  latestShotAt: number
}

type ShotsViewToggleProps = {
  readonly grouped: boolean
  readonly onGroupedChange: (grouped: boolean) => void
}

export function ShotsViewToggle({ grouped, onGroupedChange }: ShotsViewToggleProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={grouped ? "primary" : "outline"}
      className="sm:h-11"
      aria-pressed={grouped}
      onClick={() => onGroupedChange(!grouped)}
    >
      <ListTree aria-hidden="true" />
      Group by bean
    </Button>
  )
}

export function groupShotsByBean<Shot extends GroupableShot>(
  shots: readonly Shot[],
): ShotGroup<Shot>[] {
  const groupsByBean = new Map<string, ShotGroup<Shot>>()

  for (const shot of shots) {
    const key = shot.bean ? `bean-${shot.bean.id}` : "no-bean"
    const shotTimestamp = shot.createdAt.getTime()
    const existingGroup = groupsByBean.get(key)
    if (existingGroup) {
      existingGroup.shots.push(shot)
      existingGroup.latestShotAt = Math.max(existingGroup.latestShotAt, shotTimestamp)
      continue
    }

    groupsByBean.set(key, {
      key,
      bean: shot.bean,
      label: shot.bean?.name ?? "No bean recorded",
      shots: [shot],
      latestShotAt: shotTimestamp,
    })
  }

  return [...groupsByBean.values()].sort((a, b) => b.latestShotAt - a.latestShotAt)
}
