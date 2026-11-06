import { createFileRoute, redirect } from '@tanstack/react-router'
import { PanelPending } from '@/components/route-pending'

export const Route = createFileRoute('/admin/')({
  pendingComponent: PanelPending,
  beforeLoad: () => {
    throw redirect({ to: '/admin/users', search: { page: 0 } })
  },
})
