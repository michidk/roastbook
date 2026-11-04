import { demoFunction } from './functions'

const unavailable = demoFunction('auth/unavailable')
export const authClient = {
  $fetch: unavailable,
  signOut: unavailable,
  changeEmail: unavailable,
  revokeOtherSessions: unavailable,
  oauth2: { consent: unavailable },
  emailOtp: { sendVerificationOtp: unavailable },
  signIn: { emailOtp: unavailable, passkey: unavailable },
  passkey: {
    listUserPasskeys: unavailable,
    deletePasskey: unavailable,
    addPasskey: unavailable,
  },
}
