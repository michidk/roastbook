import { Link } from '@tanstack/react-router'
import { Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { usePwaMode } from '@/hooks/use-pwa-mode'

export function PwaConnectionStatus() {
  const isPwa = usePwaMode()
  const online = useOnlineStatus()
  if (!isPwa) return null
  const Icon = online ? Wifi : WifiOff
  const label = `${online ? 'Online' : 'Offline'}. Open PWA settings`
  return (
    <Button variant="ghost" size="icon" asChild>
      <Link to="/settings/offline" aria-label={label} title={label}>
        <Icon
          aria-hidden="true"
          className={online ? 'text-muted-foreground' : 'text-destructive-text'}
        />
      </Link>
    </Button>
  )
}
