import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'

export function AdminNavigation() {
  return (
    <nav aria-label="Administration" className="mb-6 flex flex-wrap gap-2">
      <Link
        to="/admin/users"
        search={{ page: 0 }}
        className={buttonVariants({ variant: 'outline' })}
        activeProps={{ 'aria-current': 'page', className: 'bg-secondary' }}
      >
        Users
      </Link>
      <Link
        to="/admin/ai"
        search={{ includeByo: false, days: 30 }}
        className={buttonVariants({ variant: 'outline' })}
        activeProps={{ 'aria-current': 'page', className: 'bg-secondary' }}
      >
        AI costs and requests
      </Link>
    </nav>
  )
}
