import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ReauthenticationAction } from '@/modules/auth/reauthentication'
import type { AdminUser } from '@/routes/admin/-components/admin-user-actions'

export interface AdminUserColumn {
  id: string
  header: string
  align?: 'right'
  /** Hidden on the user page, which shows the same value itself. */
  listOnly?: boolean
  cell: (user: AdminUser) => ReactNode
}

export interface AdminUserAction {
  id: string
  label: string
  icon: LucideIcon
  title: string
  description: (user: AdminUser) => string
  form: (context: {
    user: AdminUser
    busy: boolean
    /** With `confirm`, the admin signs in again and `work` gets the token. */
    run: (
      work: (reauthToken: string | undefined) => Promise<unknown>,
      message: string,
      confirm?: ReauthenticationAction,
    ) => Promise<void>
    close: () => void
  }) => ReactNode
}

// Defaults: the user table has only the built-in columns and actions. An
// extension can add columns and row-menu actions that open a dialog form.
export const adminUserColumns: readonly AdminUserColumn[] = []
export const adminUserActions: readonly AdminUserAction[] = []
