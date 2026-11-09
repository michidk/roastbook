import { z } from 'zod'
import { extensionReauthenticationActions } from '@/extension-points/reauthentication-actions'

/**
 * Sensitive actions that each need their own confirmation: the owner signs in
 * again (email code or passkey) right before the action, and the confirmation
 * is valid for that one action only.
 */
export const REAUTHENTICATION_ACTIONS = {
  'connect-application': 'connect an application to your journal',
  'create-credential': 'create an API key or MCP token',
  'change-permissions': 'change what a key or application may do',
  'save-ai-credentials': 'save your AI provider key',
  'export-account': 'export your journal',
  'delete-account': 'delete your account',
  'change-user-role': 'change a user’s role',
  'delete-user': 'delete a user',
  'change-email': 'change your email address',
  'manage-passkeys': 'change your passkeys',
  ...extensionReauthenticationActions,
} as const

/**
 * Actions handled by the authentication library itself: they only need the
 * fresh session the confirmation creates, not a confirmation token.
 */
export const SESSION_ONLY_ACTIONS: ReadonlySet<ReauthenticationAction> =
  new Set(['change-email', 'manage-passkeys'])

export type ReauthenticationAction = keyof typeof REAUTHENTICATION_ACTIONS

export const reauthenticationActionSchema = z.enum(
  Object.keys(REAUTHENTICATION_ACTIONS) as [
    ReauthenticationAction,
    ...ReauthenticationAction[],
  ],
)

/** The single-use confirmation a sensitive server function receives. */
export const reauthenticationTokenSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{43}$/)
  .optional()
