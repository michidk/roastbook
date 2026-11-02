import { type SubmitEvent, useEffect, useRef, useState } from 'react'
import { z } from 'zod'
import { authClient } from '@/lib/auth-client'
import { selectOfflineOwner } from '@/lib/journal-owner'
import { getPasskeySetupOffer } from '@/lib/server/passkey-prompt'
import {
  LOGIN_DRAFT_KEY,
  type LoginStep,
  RESEND_DELAY_MS,
  readMagicLink,
  restoreLoginDraft,
  serializeLoginDraft,
} from './login-state'

const redirectSchema = z.object({ url: z.string() })
type Activity = 'sending' | 'verifying' | 'resending' | 'passkey' | null

export function useLoginForm() {
  const [step, setStep] = useState<LoginStep>({ kind: 'email', email: '' })
  const [ready, setReady] = useState(false)
  const [activity, setActivity] = useState<Activity>(null)
  const [error, setError] = useState('')
  const [now, setNow] = useState(0)
  const [passkeyRedirect, setPasskeyRedirect] = useState<string | null>(null)
  const initialized = useRef(false)
  const emailInput = useRef<HTMLInputElement>(null)
  const codeInput = useRef<HTMLInputElement>(null)
  const busy = activity !== null || passkeyRedirect !== null
  const remaining =
    step.kind === 'email'
      ? 0
      : Math.max(0, Math.ceil((step.sentAt + RESEND_DELAY_MS - now) / 1000))

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const time = Date.now()
    const link = readMagicLink(window.location.hash)
    if (link.kind === 'valid') {
      setStep({
        kind: 'confirm',
        email: link.email,
        code: link.code,
        sentAt: time,
      })
    } else {
      try {
        setStep(
          restoreLoginDraft(sessionStorage.getItem(LOGIN_DRAFT_KEY), time),
        )
      } catch {
        // Storage is optional; sign-in still works in memory.
      }
      if (link.kind === 'invalid')
        setError('This sign-in link is incomplete. Request a new email below.')
    }
    if (window.location.hash)
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname + window.location.search,
      )
    setNow(time)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    try {
      sessionStorage.setItem(LOGIN_DRAFT_KEY, serializeLoginDraft(step))
    } catch {
      // A blocked storage API must not interrupt sign-in.
    }
  }, [ready, step])

  const stepKind = step.kind
  useEffect(() => {
    if (!ready || stepKind === 'email') return
    if (stepKind === 'code') codeInput.current?.focus()
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [ready, stepKind])

  function clearDraft() {
    try {
      sessionStorage.removeItem(LOGIN_DRAFT_KEY)
    } catch {
      /* Storage is optional. */
    }
  }

  function completeSignIn(data: unknown) {
    clearDraft()
    const redirect = redirectSchema.safeParse(data)
    window.location.assign(redirect.success ? redirect.data.url : '/overview')
  }

  async function completeEmailSignIn(data: unknown) {
    clearDraft()
    try {
      if (window.PublicKeyCredential) {
        const { ownerId, offer } = await getPasskeySetupOffer()
        await selectOfflineOwner(ownerId)
        if (offer) {
          const redirect = redirectSchema.safeParse(data)
          setPasskeyRedirect(redirect.success ? redirect.data.url : '/overview')
          return
        }
      }
    } catch {
      // An optional setup reminder must not prevent a successful sign-in.
    }
    completeSignIn(data)
  }

  function continueAfterPasskey() {
    if (passkeyRedirect) completeSignIn({ url: passkeyRedirect })
  }

  async function sendEmail(resend = false) {
    if (!ready || busy || (resend && remaining > 0)) return
    setActivity(resend ? 'resending' : 'sending')
    setError('')
    try {
      const email = step.email.trim()
      const result = await authClient.emailOtp.sendVerificationOtp({
        email,
        type: 'sign-in',
      })
      if (result.error)
        throw new Error(
          result.error.message ?? 'Could not send your email. Try again.',
        )
      const sentAt = Date.now()
      setNow(sentAt)
      setStep({ kind: 'code', email, code: '', sentAt })
      if (resend) requestAnimationFrame(() => codeInput.current?.focus())
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not send your email. Try again.',
      )
    } finally {
      setActivity(null)
    }
  }

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || busy) return
    if (step.kind === 'email') return sendEmail()
    setActivity('verifying')
    setError('')
    try {
      const result = await authClient.signIn.emailOtp({
        email: step.email,
        otp: step.code,
      })
      if (result.error)
        throw new Error(
          result.error.message ??
            'This code is invalid or expired. Request a new email.',
        )
      await completeEmailSignIn(result.data)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not sign in. Try again.',
      )
      setActivity(null)
      requestAnimationFrame(() => {
        codeInput.current?.focus()
        codeInput.current?.select()
      })
    }
  }

  async function signInPasskey() {
    if (!ready || busy) return
    setActivity('passkey')
    setError('')
    try {
      if (!window.PublicKeyCredential)
        throw new Error(
          'Passkeys are unavailable in this browser. Use your email to sign in.',
        )
      const result = await authClient.signIn.passkey()
      if (result.error)
        throw new Error(
          'Passkey sign-in was not completed. Try again or use your email.',
        )
      completeSignIn(result.data)
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Could not use your passkey. Try your email instead.',
      )
      setActivity(null)
    }
  }

  function changeEmail() {
    setStep({ kind: 'email', email: step.email })
    setError('')
    requestAnimationFrame(() => emailInput.current?.focus())
  }

  function setEmail(email: string) {
    setStep({ kind: 'email', email })
  }
  function setCode(value: string) {
    if (step.kind !== 'code') return
    setStep({ ...step, code: value.replace(/\D/g, '').slice(0, 8) })
    if (error) setError('')
  }

  return {
    step,
    ready,
    activity,
    busy,
    error,
    remaining,
    emailInput,
    codeInput,
    submit,
    sendEmail,
    signInPasskey,
    changeEmail,
    setEmail,
    setCode,
    passkeyPromptOpen: passkeyRedirect !== null,
    continueAfterPasskey,
  }
}
