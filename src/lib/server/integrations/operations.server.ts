import '@tanstack/react-start/server-only'
import { COLLECTION_OPERATIONS } from './collection-operations.server'
import type { IntegrationOperation } from './operation.server'
import { SUPPORT_OPERATIONS } from './support-operations.server'

export type {
  IntegrationContext,
  IntegrationOperation,
} from './operation.server'

/**
 * Everything an integration can do, shared by `/api/v1` and MCP. Operations
 * call the same journal functions as the app, inside the owner's journal
 * scope, so row-level security limits them to the credential owner's data.
 * Account, credential, sign-in and instance settings are deliberately absent.
 */
export const INTEGRATION_OPERATIONS = [
  ...COLLECTION_OPERATIONS,
  ...SUPPORT_OPERATIONS,
] as const satisfies readonly IntegrationOperation[]

const byName = new Map<string, IntegrationOperation>(
  INTEGRATION_OPERATIONS.map((operation) => [operation.name, operation]),
)

export function getIntegrationOperation(name: string) {
  return byName.get(name)
}

export const INTEGRATION_OPERATION_NAMES = INTEGRATION_OPERATIONS.map(
  (operation) => operation.name,
)
