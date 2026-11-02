import '@tanstack/react-start/server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { getServerEnv } from '@/lib/env.server'

function encryptionKey() {
  const value = getServerEnv().AI_CREDENTIAL_ENCRYPTION_KEY
  if (!value) throw new Error('AI credential storage is unavailable')
  return Buffer.from(value, 'base64')
}
export function encryptAiKey(
  secret: string,
  owner: string,
  endpoint: string,
  key = encryptionKey(),
) {
  const nonce = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, nonce)
  cipher.setAAD(Buffer.from(JSON.stringify([owner, endpoint])))
  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ])
  return [
    'v1',
    nonce.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url'),
  ].join('.')
}
export function decryptAiKey(
  value: string,
  owner: string,
  endpoint: string,
  key = encryptionKey(),
) {
  try {
    const [version, nonce, tag, encrypted, extra] = value.split('.')
    if (version !== 'v1' || !nonce || !tag || !encrypted || extra)
      throw new Error('Invalid credential')
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(nonce, 'base64url'),
    )
    decipher.setAAD(Buffer.from(JSON.stringify([owner, endpoint])))
    decipher.setAuthTag(Buffer.from(tag, 'base64url'))
    return Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64url')),
      decipher.final(),
    ]).toString('utf8')
  } catch {
    throw new Error(
      'AI credentials could not be unlocked. Save your API key again or contact the administrator.',
    )
  }
}
