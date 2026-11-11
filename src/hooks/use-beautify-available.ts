import { useEffect, useState } from 'react'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { DEMO_MODE } from '@/lib/build-mode'
import { checkVisionEnabled } from '@/lib/client/research'

export function useBeautifyAvailable() {
  const isOnline = useOnlineStatus()
  const [available, setAvailable] = useState(false)
  useEffect(() => {
    if (DEMO_MODE || !isOnline) return setAvailable(false)
    let active = true
    void checkVisionEnabled().then((result) => {
      if (active) setAvailable(result.enabled)
    })
    return () => {
      active = false
    }
  }, [isOnline])
  return available
}
