import { createServerFn } from '@tanstack/react-start'
import {
  dismissPasskeySetup,
  loadPasskeySetupOffer,
} from './auth/passkey-prompt.server'

export const getPasskeySetupOffer = createServerFn({ method: 'GET' }).handler(
  loadPasskeySetupOffer,
)

export const dismissPasskeySetupOffer = createServerFn({
  method: 'POST',
}).handler(dismissPasskeySetup)
